use crate::{
    account::accounts,
    action::{
        action_rounds, actions, special_actions, ActionEffect, ActionHandle, SpecialActionKey,
    },
    appearance::en_appearance_features,
    asset::ReducerContextExtension,
    asset::{
        armament::armaments,
        armor::armors,
        location_map::{location_map_connections, location_maps},
        quest::quests,
        location_map_theme::location_map_themes,
        r#trait::traits,
        relic::relics,
        stance::stances,
        stat_block::StatBlock,
        weighted_sampler::WeightedSampler,
    },
    ecs_extension::EcsExtension,
    entity::*,
    entity_handle_extension::EntityHandleExtension,
    event::{observable_events, EventQueue, EventType, NewEvent},
    quest::entities_quests_progress,
};
use ecs::Ecs;
use spacetimedb::{rand::seq::SliceRandom, Table};
use std::cmp::{max, min};

pub fn hp_system(ecs: Ecs) {
    for mut e in ecs.iter_hp() {
        let hp = e.hp_mut();
        // Settle in i32: the i16 fields can't overflow a widened sum, and the
        // clamp guarantees the result narrows back losslessly.
        let settled = i32::from(hp.hp) + i32::from(hp.accumulated_healing)
            - i32::from(hp.accumulated_damage);
        hp.hp = max(0, min(i32::from(hp.mhp), settled)) as i16;
        hp.accumulated_healing = 0;
        hp.accumulated_damage = 0;
        e.update_hp();
    }
}

pub fn ep_system(ecs: Ecs) {
    for mut e in ecs.iter_ep() {
        let ep = e.ep_mut();
        ep.ep = max(0, min(ep.mep, ep.ep));
        e.update_ep();
    }
}

/// How long a dead player's body stays in the scene before the respawn
/// takes them away. Unrelated to the checkpoint trance fiction — this is
/// simply being dead for a moment where you fell.
const RESPAWN_DELAY_MICROS: i64 = 3_000_000;

/// Zero HP resolves here, right after damage settles. NPCs die: they stop
/// acting immediately and are handed to the deletion timer (which spills
/// their carried items into the room). A dead player's body stays where it
/// fell, unable to act, until the respawn delay elapses and the wake at
/// the checkpoint takes them out of the situation.
pub fn death_system(ecs: Ecs) {
    // Breakables get collected first: shattering deletes their hp row, and
    // the hp table must not be mutated mid-iteration.
    let mut shattered: Vec<u64> = Vec::new();
    for e in ecs.iter_hp() {
        if e.hp().hp > 0 {
            continue;
        }
        let handle = e.into_handle();
        if handle.player_controller().is_some() && handle.respawn_timer().is_some() {
            // Already dead and waiting; the respawn system handles the rest.
            continue;
        }
        // An NPC corpse is processed exactly once (the flag is its latch:
        // narration and state-shedding never repeat while it lingers).
        if handle.perished().is_some() {
            continue;
        }
        let entity_id = handle.entity_id();
        if handle.action_state().is_some() {
            handle.delete_action_state();
        }
        if handle.action_queue().is_some() {
            handle.delete_action_queue();
        }
        // A fallen boss-claim spawn pays out its drop (the component is
        // its own one-shot latch — consumed inside, so the lingering
        // corpse never re-drops).
        if handle.defeat_drop().is_some() {
            crate::quest::drop_defeat_reward(ecs, entity_id);
        }
        if handle.player_controller().is_some() {
            handle.upsert_new_respawn_timer(
                ecs.timestamp
                    + spacetimedb::TimeDuration::from_micros(RESPAWN_DELAY_MICROS),
            );
            ecs.db
                .observable_events()
                .insert(ecs.new_event(entity_id, EventType::Died, entity_id));
        } else if handle.enemy_controller().is_some() {
            // A dead NPC becomes a CORPSE, never a deletion: the entity
            // remains — its name stays in every message — and the body is
            // there to see (and to target). The enemy controller also
            // REMAINS, dormant, so the threat panel keeps the fallen where
            // they fell. Map cleanup eventually sweeps corpse and
            // controller with the room. (Inventory stays INSIDE the
            // corpse — loot is a future feature; only breakables spill.)
            ecs.db
                .observable_events()
                .insert(ecs.new_event(entity_id, EventType::Died, entity_id));
            ecs.find(entity_id).upsert_new_perished();
        } else {
            // A pure physical OBJECT (no controller) breaks: any physical
            // thing yields if you hit it hard enough. It shatters — leaving
            // debris if it authored remains — and is removed, never left as a
            // lingering "corpse".
            shattered.push(entity_id);
        }
    }
    for entity_id in shattered {
        // The break narrates BEFORE anything changes, so the message
        // names the jar — never the shards.
        ecs.db
            .observable_events()
            .insert(ecs.new_event(entity_id, EventType::Shattered, entity_id));
        spill_contents(ecs, entity_id);
        let handle = ecs.find(entity_id);
        // Every destroyed object leaves DEBRIS: its authored remains if it has
        // any (ceramic shards, scrap wood), else the generic fallback. Debris
        // is a NEW entity, so the broken thing keeps its own name in every
        // baked message (the last-known cache never sees a rename) and the
        // debris arrives as fresh decoration.
        let debris_feature_ids = handle
            .remains()
            .map(|r| r.appearance_feature_ids)
            .unwrap_or_else(|| generic_debris_feature_ids(ecs));
        if !debris_feature_ids.is_empty() {
            let location = handle.location().map(|l| l.location_entity_id);
            if let Some(location_entity_id) = location {
                ecs.new()
                    .upsert_new_location(location_entity_id, LocationKind::Interior)
                    .into_handle()
                    .upsert_new_appearance_features(debris_feature_ids);
            }
        }
        // The broken thing is always removed — whether it left debris behind
        // or simply came apart into nothing.
        delete_entity_with_joins(ecs, entity_id);
    }
}

/// The generic "(material) debris" a destroyed object leaves when it authored
/// no specific remains — so breaking anything leaves something behind. For now
/// one shared "debris" feature; a material system will later choose "stellar
/// debris", "wood debris", and the like. Empty when the feature is unpushed.
fn generic_debris_feature_ids(ecs: Ecs) -> Vec<u32> {
    ecs.db
        .en_appearance_features()
        .iter()
        .find(|f| f.name == "debris")
        .map(|f| vec![f.index])
        .unwrap_or_default()
}

/// Paired entities share ONE fate. This mirrors each shared entity's per-tick
/// HP DELTA onto its partner, so a blow to either side lands on both — but it
/// only ever touches the accumulated deltas, NEVER hp itself, so the deltas
/// stay truthful for any other system that reads them (hp_system settles them
/// afterward). Two clean passes: a COMPUTE pass gathers each side's missing
/// delta (skipping when nothing changes), then an UPDATE pass applies it.
///
/// Idempotency rides the TRANSIENT hp_share_applied component: it records what
/// this system already mirrored onto each entity this tick, so a re-run
/// subtracts it and never multi-counts. That state is event-backed, so it
/// vanishes with the transaction and needs no reset. (Limitation: before this
/// system runs the deltas are still un-shared, so ordering matters.)
pub fn hp_share_system(ecs: Ecs) {
    // Each side's ORIGINAL delta this tick = its current delta minus whatever
    // this system already mirrored onto it (nothing, until the update pass).
    let applied_damage =
        |c: &Option<HpShareAppliedComponent>| c.as_ref().map_or(0i32, |a| i32::from(a.damage));
    let applied_healing =
        |c: &Option<HpShareAppliedComponent>| c.as_ref().map_or(0i32, |a| i32::from(a.healing));
    let clamp_i16 = |v: i32| v.clamp(i32::from(i16::MIN), i32::from(i16::MAX)) as i16;

    struct Pending {
        entity_id: u64,
        add_damage: i16,
        add_healing: i16,
    }

    // COMPUTE PASS: read-only. Each side's target is the pair's COMBINED
    // original delta; the add is whatever that side is still missing.
    let mut pending: Vec<Pending> = Vec::new();
    for e in ecs.iter_hp_share() {
        let handle = e.into_handle();
        let (Some(share), Some(hp)) = (handle.hp_share(), handle.hp()) else {
            continue;
        };
        let partner = ecs.find(share.partner_entity_id);
        let Some(partner_hp) = partner.hp() else {
            continue;
        };
        let own_applied = handle.hp_share_applied();
        let partner_applied = partner.hp_share_applied();
        let own_d = i32::from(hp.accumulated_damage);
        let own_h = i32::from(hp.accumulated_healing);
        let own_orig_d = own_d - applied_damage(&own_applied);
        let own_orig_h = own_h - applied_healing(&own_applied);
        let partner_orig_d =
            i32::from(partner_hp.accumulated_damage) - applied_damage(&partner_applied);
        let partner_orig_h =
            i32::from(partner_hp.accumulated_healing) - applied_healing(&partner_applied);
        let add_damage = clamp_i16((own_orig_d + partner_orig_d) - own_d);
        let add_healing = clamp_i16((own_orig_h + partner_orig_h) - own_h);
        if add_damage == 0 && add_healing == 0 {
            continue;
        }
        pending.push(Pending {
            entity_id: handle.entity_id(),
            add_damage,
            add_healing,
        });
    }

    // UPDATE PASS: apply to the entity's own DELTAS (never hp), and record the
    // cumulative applied amount in the transient component for idempotency.
    for p in pending {
        let handle = ecs.find(p.entity_id);
        if let Some(mut hp) = handle.hp() {
            hp.accumulated_damage = hp.accumulated_damage.saturating_add(p.add_damage);
            hp.accumulated_healing = hp.accumulated_healing.saturating_add(p.add_healing);
            handle.clone().update_hp_row(hp);
        }
        let prior = handle.hp_share_applied();
        let damage = prior
            .as_ref()
            .map_or(0, |a| a.damage)
            .saturating_add(p.add_damage);
        let healing = prior
            .as_ref()
            .map_or(0, |a| a.healing)
            .saturating_add(p.add_healing);
        handle.upsert_new_hp_share_applied(damage, healing);
    }
}

/// The respawn: once the delay elapses, resolve the abstract checkpoint
/// (map asset + checkpoint index) to a real room — generating the map on
/// demand when no instance exists yet (the same resolution teleportation
/// will use) — then restore and relocate. THIS is where the checkpoint's
/// trance fiction lives: the player wakes from the trance they sealed by
/// attuning.
pub fn respawn_system(ecs: Ecs) {
    for t in ecs.iter_respawn_timer() {
        if t.respawn_timer().timestamp > ecs.timestamp {
            continue;
        }
        let handle = t.into_handle();
        match handle.checkpoint() {
            None => {
                log::error!(
                    "Entity {} hit its respawn with no checkpoint; reviving in place.",
                    handle.entity_id()
                );
            }
            Some(checkpoint) => match resolve_checkpoint_room(ecs, &checkpoint) {
                Err(reason) => {
                    log::error!(
                        "Entity {} cannot reach its checkpoint ({}); reviving in place.",
                        handle.entity_id(),
                        reason
                    );
                }
                Ok(room_entity_id) => {
                    handle
                        .clone()
                        .upsert_new_location(room_entity_id, LocationKind::Interior);
                }
            },
        }
        handle.restore_fully();
        handle.delete_respawn_timer();
    }
}

/// The checkpoint's room: an existing instance of the map if one is
/// generated, else a freshly generated one.
fn resolve_checkpoint_room(
    ecs: Ecs,
    checkpoint: &CheckpointComponent,
) -> Result<u64, String> {
    let instance_checkpoints = ecs
        .iter_map_instance()
        .find(|m| m.map_instance().location_map_id == checkpoint.location_map_id)
        .and_then(|m| m.into_handle().map_checkpoints())
        .map(|c| c.checkpoint_room_entity_ids);
    let checkpoints = match instance_checkpoints {
        Some(checkpoints) => checkpoints,
        None => {
            let map = ecs
                .db
                .location_maps()
                .id()
                .find(checkpoint.location_map_id)
                .ok_or_else(|| {
                    format!("unknown location map {}", checkpoint.location_map_id)
                })?;
            crate::map_materialization::materialize_map(ecs, &map)?
                .checkpoint_room_entity_ids
        }
    };
    checkpoints
        .get(checkpoint.checkpoint_index as usize)
        .copied()
        .ok_or_else(|| {
            format!(
                "map {} has no checkpoint {}",
                checkpoint.location_map_id, checkpoint.checkpoint_index
            )
        })
}

/// Stamps each player's actionless_since the moment they have neither an
/// active nor a queued action, and clears it the moment they do. The turn
/// guard reads the stamp's age to decide who counts as idle.
pub fn actionless_stamp_system(ecs: Ecs) {
    for p in ecs.iter_player_controller() {
        let handle = p.into_handle();
        let has_assigned_action = handle.action_state().is_some()
            || { handle.action_queue() }.is_some_and(|q| !q.entries.is_empty());
        if has_assigned_action {
            if handle.actionless_since().is_some() {
                handle.delete_actionless_since();
            }
        } else if handle.actionless_since().is_none() {
            handle.upsert_new_actionless_since(ecs.timestamp);
        }
    }
}

pub fn shift_queued_action_system(ecs: Ecs) {
    for e in ecs.iter_action_queue() {
        if e.action_queue().entries.is_empty() {
            continue;
        }
        // A turn-guarded instance freezes even the queued->active shift:
        // its time simply does not pass.
        if crate::turn::instance_is_paused(ecs, e.action_queue().entity_id) {
            continue;
        }
        // A queued action normally waits the active one out — but while the
        // active action's CURRENT round is interruptible, queuing cancels it
        // immediately.
        let can_replace = match e.action_state() {
            None => true,
            Some(active) => ActionHandle::from_id(&ecs, active.action_id)
                .round(active.sequence_index)
                .is_some_and(|round| round.interruptible),
        };
        if can_replace {
            if e.action_state().is_some() {
                e.delete_action_state();
            }
            // Validity is the action-validation system's business (it
            // sweeps dirty queues before the next progression); the
            // shift only starts what the queue holds.
            let e = e.into_handle().shift_queued_action_state();
            if let Some(a) = e.action_state() {
                ecs.db.observable_events().insert(ecs.new_event(
                    a.entity_id,
                    EventType::StartAction(a.action_id),
                    a.target_entity_id,
                ));
            }
        }
    }
}

pub fn action_system(ecs: Ecs) {
    let mut queue = EventQueue::new();
    for mut e in ecs.iter_action_state() {
        let action_state = e.action_state();
        let entity_id = action_state.entity_id;
        // Turn guard: while the entity's instance waits on a player's
        // choice, its active actions hold mid-round.
        if crate::turn::instance_is_paused(ecs, entity_id) {
            continue;
        }
        let action_handle = ActionHandle::from_id(&ecs, action_state.action_id);
        let effects = match action_handle.round(action_state.sequence_index).map(|r| r.effects) {
            Some(effects) => effects,
            None => {
                // A state pointing past the action's rounds should be
                // impossible; surface it and drop the state rather than
                // ticking forever.
                log::error!(
                    "Entity {} has action state past the rounds of action {}.",
                    entity_id,
                    action_state.action_id
                );
                Vec::new()
            }
        };

        // Every round of every action — even a wait — intimidates all
        // enemies present: the implicit size-delta baseline plus whatever
        // extra this round authors (heavies put Intimidate on their
        // telegraphs). One early-phase event per enemy; early so that fear
        // lands BEFORE this tick's blows.
        {
            let actor = ecs.find(entity_id);
            let actor_size = actor
                .total_stat_block()
                .map_or(0, |t| i32::from(t.stat_block.size));
            let authored: i32 = effects
                .iter()
                .map(|effect| match effect {
                    ActionEffect::Intimidate(magnitude) => i32::from(*magnitude),
                    _ => 0,
                })
                .sum();
            if let Some(location) = actor.location() {
                let cohabitants: Vec<_> = ecs
                    .db
                    .location_components()
                    .location_entity_id()
                    .filter(location.location_entity_id)
                    .collect();
                for cohabitant in cohabitants {
                    if cohabitant.entity_id == entity_id
                        || actor.is_ally(cohabitant.entity_id)
                    {
                        continue;
                    }
                    let victim = ecs.find(cohabitant.entity_id);
                    // Only something that fights from a stance can be
                    // forced into one: stanceless scenery is immune.
                    if victim.active_stance().is_none() {
                        continue;
                    }
                    let victim_size = victim
                        .total_stat_block()
                        .map_or(0, |t| i32::from(t.stat_block.size));
                    let magnitude = max(0, actor_size - victim_size) + authored;
                    if magnitude > 0 {
                        queue.emit_early(ecs.new_event(
                            entity_id,
                            EventType::ActionEffect(ActionEffect::Intimidate(
                                magnitude.min(i32::from(i16::MAX)) as i16,
                            )),
                            cohabitant.entity_id,
                        ));
                    }
                }
            }
        }

        for effect in &effects {
            match effect {
                // Absorbed into the broadcast above; never emitted at the
                // action's own target.
                ActionEffect::Intimidate(_) => {}
                ActionEffect::Rally => {
                    queue.emit_middle(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    ));
                }
                ActionEffect::SetStance(_) => {
                    queue.emit_late(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    ));
                }
                // A defensive reaction: early, so the braced defense stands
                // before this tick's blows.
                ActionEffect::Dive(_) => {
                    queue.emit_early(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    ));
                }
                ActionEffect::Buff(_) => {
                    queue.emit_early(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    ));
                }
                ActionEffect::Attack(damage) => {
                    let attack = i32::from(e.attack().map(|c| c.attack).unwrap_or(0));
                    let t = ecs.find(action_state.target_entity_id);
                    let target_defense = i32::from(t.hp().map(|c| c.defense).unwrap_or(0));
                    // Computed in i32 and clamped to the i16 damage range so
                    // the narrowing below is lossless.
                    let dealt = max(0, i32::from(*damage) + attack - target_defense)
                        .min(i32::from(i16::MAX)) as i16;
                    queue.emit_middle(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(ActionEffect::Attack(dealt)),
                        action_state.target_entity_id,
                    ));
                }
                ActionEffect::Heal(heal) => {
                    // Healing scales by the healer's FOCUS, exactly as
                    // attacks scale by attack: authored base + stat,
                    // never below zero. The plain heal authors 1 and
                    // restores 1+focus.
                    let focus = i32::from(
                        e.total_stat_block()
                            .map(|t| t.stat_block.focus)
                            .unwrap_or(0),
                    );
                    let amount = max(0, i32::from(*heal) + focus)
                        .min(i32::from(i16::MAX)) as i16;
                    queue.emit_middle(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(ActionEffect::Heal(amount)),
                        action_state.target_entity_id,
                    ));
                }
                _ => {
                    queue.emit_late(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    ));
                }
            }
        }

        let action_state = e.action_state_mut();
        action_state.sequence_index += 1;
        let new_sequence_index = action_state.sequence_index;

        let with_action_state = e.update_action_state();

        // Rounds without effects are waits; the action finishes only when
        // there is NO next round.
        if action_handle.round(new_sequence_index).is_none() {
            // TODO Emit event for finished action.
            with_action_state.delete_action_state();
        }
    }

    queue.resolve(ecs);
}

/// THE way an entity actually ceases to exist: its join rows (visited
/// locations, quest progress) die with it, then the entity itself. Its
/// CONTENTS spill first — nothing is ever stranded inside a thing that
/// stopped existing. Every deletion site calls this — never `.delete()`
/// directly — so a new join table has exactly one place to hook.
pub(crate) fn delete_entity_with_joins(ecs: Ecs, entity_id: u64) {
    spill_contents(ecs, entity_id);
    crate::visited::cleanup_visited_rows(ecs, entity_id);
    crate::quest::cleanup_quest_rows(ecs, entity_id);
    crate::quest::cleanup_quest_room_rows(ecs, entity_id);
    ecs.find(entity_id).delete();
}

/// Anything an entity carries has that entity as its location; when the
/// carrier is destroyed or deleted, the contents move OUT to the carrier's
/// own location. A carrier with no location (map/room teardown) leaves
/// this to the recursive cleanup that is already deleting its contents.
pub(crate) fn spill_contents(ecs: Ecs, entity_id: u64) {
    // The carrier's FULL location pair: spilled contents land exactly
    // where it stood, kind included.
    let Some(destination) = ecs.db.location_components().entity_id().find(entity_id) else {
        return;
    };
    let contained: Vec<u64> = ecs
        .db
        .location_components()
        .location_entity_id()
        .filter(entity_id)
        .map(|c| c.entity_id)
        .collect();
    for contained_id in contained {
        if let Some(mut row) = ecs.db.location_components().entity_id().find(contained_id) {
            row.location_entity_id = destination.location_entity_id;
            row.kind = destination.kind;
            ecs.db.location_components().entity_id().update(row);
            // Every spill narrates, whatever caused it — a dumped sack, a
            // shattered jar, a destroyed carrier.
            ecs.db.observable_events().insert(ecs.new_event(
                entity_id,
                EventType::Spilled,
                contained_id,
            ));
        }
    }
}

pub fn entity_deletion_timer_system(ecs: Ecs) {
    for t in ecs.iter_entity_deletion_timer() {
        if t.entity_deletion_timer().timestamp <= ecs.timestamp {
            delete_entity_with_joins(ecs, t.entity_id());
        }
    }
}

pub fn player_deactivation_timer_system(ecs: Ecs) {
    for t in ecs.iter_player_deactivation_timer() {
        if t.player_deactivation_timer().timestamp <= ecs.timestamp {
            t.delete_player_deactivation_timer().delete_location();
            // WIP Add a checkpoint_location_component to place player after login.
        }
    }
}

pub fn entity_stats_system(ecs: Ecs) {
    for f in ecs.iter_traits_stat_block_dirty_flag() {
        if let Some(c) = ecs.find(f.entity_id()).with_traits() {
            let mut stat_block = StatBlock::default();
            for id in &c.traits().trait_ids {
                if let Some(t) = ecs.db.traits().id().find(id) {
                    stat_block += &t.stat_block;
                }
            }

            // Upserting the cache auto-dirties the total stat block (its
            // declared dirty flag) — no manual flag here.
            f.upsert_new_traits_stat_block_cache(stat_block)
                .delete_traits_stat_block_dirty_flag()
                .into_handle();
        }
    }

    // Gear merges three sources: wielded armaments (per-stance via loadouts,
    // or blob-authored for NPCs), the one global armor slot, and the worn
    // relics. Always processed — an entity stripped of its last gear
    // component still needs its (now empty) cache recomputed.
    for f in ecs.iter_equipment_stat_block_dirty_flag() {
        let e = ecs.find(f.entity_id());
        let mut stat_block = StatBlock::default();
        // Stats derive from the CANONICAL equipment alone — the worn
        // reality. The armor/relics CONFIGURATION components never feed
        // stats; the reconciliation system converges reality to them.
        if let Some(c) = e.equipment() {
            for id in &c.armament_ids {
                if let Some(a) = ecs.db.armaments().id().find(id) {
                    stat_block += &a.stat_block;
                }
            }
            if let Some(armor_id) = c.worn_armor_id {
                if let Some(a) = ecs.db.armors().id().find(armor_id) {
                    stat_block += &a.stat_block;
                }
            }
            for id in &c.worn_relic_ids {
                if let Some(r) = ecs.db.relics().id().find(id) {
                    stat_block += &r.stat_block;
                }
            }
        }

        // Upserting the cache auto-dirties the total stat block (its
        // declared dirty flag) — no manual flag here.
        f.upsert_new_equipment_stat_block_cache(stat_block)
            .delete_equipment_stat_block_dirty_flag()
            .into_handle();
    }

    // Status effects contribute stat blocks like everything else: courage
    // folds into rigid morale, braced into defense. The cache upsert
    // auto-dirties the total.
    for f in ecs.iter_status_stat_block_dirty_flag() {
        let e = ecs.find(f.entity_id());
        let mut stat_block = StatBlock::default();
        if let Some(c) = e.courage_status() {
            stat_block.morale = c.morale.clamp(i16::from(i8::MIN), i16::from(i8::MAX)) as i8;
        }
        if let Some(c) = e.braced_status() {
            stat_block.defense = c.defense.clamp(i16::from(i8::MIN), i16::from(i8::MAX)) as i8;
        }
        f.upsert_new_status_stat_block_cache(stat_block)
            .delete_status_stat_block_dirty_flag()
            .into_handle();
    }

    // Quest progress contributes through its own cache like every other
    // source: each quest's per-bit block, added popcount times (saturating;
    // any granted ids dedup through the id-vec union rule). Bits only turn
    // ON, so this contribution is monotonic — exactly what the maxima
    // ratchet asks of mhp/mep sources.
    for f in ecs.iter_quest_stat_block_dirty_flag() {
        let entity_id = f.entity_id();
        let mut stat_block = StatBlock::default();
        for row in ecs
            .db
            .entities_quests_progress()
            .entity_id()
            .filter(entity_id)
        {
            if let Some(quest) = ecs.db.quests().id().find(row.quest_id) {
                for _ in 0..row.bits.count_ones() {
                    stat_block += &quest.per_bit_stat_block;
                }
            }
        }
        f.upsert_new_quest_stat_block_cache(stat_block)
            .delete_quest_stat_block_dirty_flag()
            .into_handle();
    }

    for f in ecs.iter_total_stat_block_dirty_flag() {
        // A baseline or trait is enough to derive a stat block — no opt-in
        // flag, no special cases. Every derived block is applied in full;
        // whether the entity reads as a threat, a breakable object, or a
        // near-indestructible structural feature is simply a matter of the HP
        // and defense its baseline and traits give it.
        log::debug!("Entity {} is computing total stat block.", f.entity_id());
        let mut stat_block = f.base_stat_block();

        if let Some(s) = { f.active_stance() }
            .and_then(|active| ecs.db.stances().id().find(active.stance_id))
        {
            stat_block += &s.stat_block;
        }

        // Derived availability: an action the total's requirements check
        // rejects is granted but not currently usable, so it never reaches
        // the ActionsComponent. A posture into the stance ALREADY HELD is
        // no option either — you can't stand when already standing. The
        // TOTAL keeps its full grants (clients build candidate sets from
        // it); only the AVAILABLE list is filtered. Swapping stances (or
        // any stat change) re-derives this through the same dirty flag.
        let active_stance_id = { f.active_stance() }.map(|active| active.stance_id);
        let adopts_active_stance = |action_id: crate::action::ActionId| {
            let Some(active) = active_stance_id else {
                return false;
            };
            ecs.db
                .action_rounds()
                .action_sequence()
                .filter(action_id)
                .any(|round| {
                    round.effects.iter().any(|effect| {
                        matches!(effect, ActionEffect::SetStance(s) if *s == active)
                    })
                })
        };
        let available_action_ids: Vec<_> = stat_block
            .action_ids
            .iter()
            .copied()
            .filter(|id| match ecs.db.actions().id().find(id) {
                Some(action) => {
                    stat_block.meets(&action.requirements) && !adopts_active_stance(*id)
                }
                None => {
                    log::error!("Granted action id {} has no action row.", id);
                    false
                }
            })
            .collect();

        f.delete_total_stat_block_dirty_flag()
            .into_handle()
            .apply_stat_block(stat_block, available_action_ids);
    }
}

/// THE one path by which player entities come to exist: any account without
/// one gets one, as soon as the new-player blob is available. No connect
/// hook, no per-account-creation-flavor special case — created, provisioned,
/// and bootstrapped accounts all converge here.
pub fn player_provision_system(ecs: Ecs) {
    if ecs.get_new_player_blob().is_none() {
        // No assets yet (e.g. a freshly bootstrapped instance): nothing to
        // instantiate players from. The trigger stays armed.
        return;
    }
    let account_ids: Vec<_> = ecs.db.accounts().iter().map(|a| a.id).collect();
    for account_id in account_ids {
        if ecs.from_player_account(account_id).is_none() {
            match ecs.new_player(account_id) {
                Ok(p) => {
                    log::info!(
                        "Provisioned player {} for account {}.",
                        p.entity_id(),
                        account_id
                    );
                }
                Err(reason) => {
                    log::error!(
                        "Failed to provision a player for account {}: {}",
                        account_id,
                        reason
                    );
                }
            }
        }
    }
}

pub fn player_activation_system(ecs: Ecs) {
    for p in ecs.iter_player_controller() {
        // WIP Do NOT add a location if player is inactive. Consider adding a flag when deactivating.
        if p.location().is_none() {
            // WIP Add checkpoint component to select a specific location map.
            if let Some(m) = ecs.db.location_maps().iter().next() {
                match crate::map_materialization::materialize_map(ecs, &m) {
                    // WIP Add checkpoint location to select a specific room.
                    // WIP Consider adding rng seed to checkpoint to allow same map to regen.
                    Ok(map_generation_result) => {
                        if let Some(location_entity_id) =
                            map_generation_result.entrance_room_id()
                        {
                            p.insert_new_location(location_entity_id, LocationKind::Interior);
                            // A new player's checkpoint: the starting map's
                            // first generated checkpoint, automatically —
                            // an ABSTRACT destination (map + index), never
                            // a room entity.
                            p.upsert_new_checkpoint(m.id, 0);
                        }
                    }
                    Err(e) => {
                        log::error!("Map generation failed: {}", e);
                    }
                }
            }
        }
    }
}

/// How long an undemanded map instance lingers before cleanup.
const MAP_CLEANUP_DELAY_MICROS: i64 = 900_000_000;

/// THE demand predicate, driving generation, keep-alive, and cleanup alike:
/// a map instance is demanded when a player is inside it, or a player
/// shares a room with a path — materialized or pending — leading into it.
/// Demanded pending connections materialize (generating the far map on
/// demand); demanded instances shed any cleanup timer; undemanded ones gain
/// a timer and are torn down when it expires.
pub fn map_demand_system(ecs: Ecs) {
    let mut demanded: std::collections::HashSet<u64> = std::collections::HashSet::new();
    // Anchor picks need no determinism; seed a StdRng from the tick's rng.
    use spacetimedb::rand::{Rng as _, SeedableRng as _};
    let mut rng =
        spacetimedb::rand::rngs::StdRng::seed_from_u64(ecs.rng().gen::<u64>());
    for p in ecs.iter_player_controller() {
        let player = p.into_handle();
        let room_entity_id = match player.location() {
            None => continue,
            Some(location) => location.location_entity_id,
        };
        let room = ecs.find(room_entity_id);
        if let Some(m) = room.location_map() {
            demanded.insert(m.location_map_entity_id);
        }
        // Pending connections: demand generates the far side and the
        // connecting path appears.
        if let Some(pending) = room.pending_connections() {
            let mut remaining: Vec<u32> = Vec::new();
            for connection_id in pending.connection_ids {
                match materialize_connection(ecs, room_entity_id, connection_id, &mut rng) {
                    Ok(destination_instance_id) => {
                        demanded.insert(destination_instance_id);
                    }
                    Err(reason) => {
                        log::error!(
                            "Connection {} at room {} failed to materialize: {}",
                            connection_id,
                            room_entity_id,
                            reason
                        );
                        remaining.push(connection_id);
                    }
                }
            }
            if remaining.is_empty() {
                room.delete_pending_connections();
            } else {
                room.clone().upsert_new_pending_connections(remaining);
            }
        }
        // Paths out of this room keep their destinations' maps alive.
        let cohabitants: Vec<_> = ecs
            .db
            .location_components()
            .location_entity_id()
            .filter(room_entity_id)
            .collect();
        for cohabitant in cohabitants {
            let entity = ecs.find(cohabitant.entity_id);
            if let Some(path) = entity.path() {
                if let Some(destination_map) =
                    ecs.find(path.destination_entity_id).location_map()
                {
                    demanded.insert(destination_map.location_map_entity_id);
                }
            }
        }
    }

    for m in ecs.iter_map_instance() {
        let instance = m.into_handle();
        if demanded.contains(&instance.entity_id()) {
            if instance.map_cleanup_timer().is_some() {
                instance.delete_map_cleanup_timer();
            }
        } else if instance.map_cleanup_timer().is_none() {
            instance.upsert_new_map_cleanup_timer(
                ecs.timestamp
                    + spacetimedb::TimeDuration::from_micros(MAP_CLEANUP_DELAY_MICROS),
            );
        }
    }

    let expired: Vec<u64> = ecs
        .iter_map_cleanup_timer()
        .filter(|t| t.map_cleanup_timer().timestamp <= ecs.timestamp)
        .map(|t| t.entity_id())
        .filter(|id| !demanded.contains(id))
        .collect();
    for map_entity_id in expired {
        cleanup_map_instance(ecs, map_entity_id);
    }
}

/// Create the cross-map path for a demanded pending connection, generating
/// the destination map when no instance of it exists.
fn materialize_connection(
    ecs: Ecs,
    room_entity_id: u64,
    connection_id: u32,
    rng: &mut spacetimedb::rand::rngs::StdRng,
) -> Result<u64, String> {
    let connection = ecs
        .db
        .location_map_connections()
        .id()
        .find(connection_id)
        .ok_or_else(|| format!("unknown connection {}", connection_id))?;
    let find_instance = || {
        ecs.iter_map_instance()
            .find(|m| m.map_instance().location_map_id == connection.destination_location_map_id)
            .map(|m| m.entity_id())
    };
    let destination_instance_id = match find_instance() {
        Some(id) => id,
        None => {
            let map = ecs
                .db
                .location_maps()
                .id()
                .find(connection.destination_location_map_id)
                .ok_or_else(|| {
                    format!(
                        "unknown location map {}",
                        connection.destination_location_map_id
                    )
                })?;
            crate::map_materialization::materialize_map(ecs, &map)?;
            find_instance().ok_or("destination map generated no instance")?
        }
    };
    let rooms = ecs
        .find(destination_instance_id)
        .map_rooms()
        .ok_or("destination instance records no rooms")?;
    let destination_room = crate::asset::location_map::resolve_anchor_room(
        &rooms.main_room_entity_ids,
        &rooms.extra_room_entity_ids,
        &connection.destination_anchor,
        rng,
    )
    .ok_or("destination anchor resolves to no room")?;
    // An AUTHORED presentation wins (each directed row carries its half
    // of the connection's pair — "dark cave mouth" in, "bright cave
    // mouth" out); otherwise the path wears the EXIT map's theme (the
    // sampled pair's exploring direction).
    let exit_map = ecs
        .db
        .location_maps()
        .id()
        .find(connection.exit_location_map_id)
        .ok_or("unknown exit map")?;
    let path_blob = connection.path_blob.clone().or_else(|| {
        ecs.db
            .location_map_themes()
            .id()
            .find(exit_map.theme_id)
            .and_then(|theme| {
                theme
                    .paths_selector
                    .sample(rng)
                    .map(|pair| pair.forward.clone())
            })
    });
    match path_blob {
        Some(blob) => {
            ecs.new_path(blob, room_entity_id, destination_room)?;
        }
        // A theme without path blobs still connects; the path is simply
        // featureless.
        None => {
            ecs.new()
                .upsert_new_location(room_entity_id, LocationKind::Interior)
                .into_handle()
                .upsert_new_path(destination_room, LocationKind::Interior);
        }
    }
    Ok(destination_instance_id)
}

/// Tear down an undemanded map instance: every path pointing INTO its rooms
/// (including materialized cross-map paths living elsewhere), the rooms'
/// contents (recursively — carried items go with their carriers), the rooms,
/// and the instance itself.
fn cleanup_map_instance(ecs: Ecs, map_entity_id: u64) {
    log::info!("Cleaning up undemanded map instance {}.", map_entity_id);
    let room_ids: Vec<u64> = ecs
        .db
        .location_map_components()
        .iter()
        .filter(|c| c.location_map_entity_id == map_entity_id)
        .map(|c| c.entity_id)
        .collect();
    for room_id in &room_ids {
        // Leftover paths elsewhere pointing into this room die with it.
        let inbound: Vec<u64> = ecs
            .db
            .path_components()
            .destination_entity_id()
            .filter(*room_id)
            .map(|p| p.entity_id)
            .collect();
        for path_entity_id in inbound {
            delete_entity_with_joins(ecs, path_entity_id);
        }
        // Contents, recursively.
        let mut stack = vec![*room_id];
        let mut contents: Vec<u64> = Vec::new();
        while let Some(container) = stack.pop() {
            for contained in ecs
                .db
                .location_components()
                .location_entity_id()
                .filter(container)
            {
                stack.push(contained.entity_id);
                contents.push(contained.entity_id);
            }
        }
        for entity_id in contents {
            delete_entity_with_joins(ecs, entity_id);
        }
        delete_entity_with_joins(ecs, *room_id);
    }
    delete_entity_with_joins(ecs, map_entity_id);
}

/// How many carried items of the given gear kind+asset the entity owns
/// (carrying IS location): the counted-multiset supply configurations
/// must stay within.
fn owned_gear_count(ecs: Ecs, owner_entity_id: u64, wanted: &crate::item::ItemRef) -> usize {
    ecs.db
        .location_components()
        .location_entity_id()
        .filter(owner_entity_id)
        .filter(|carried| {
            ecs.db
                .item_components()
                .entity_id()
                .find(carried.entity_id)
                .is_some_and(|item| match (&item.item_ref, wanted) {
                    (crate::item::ItemRef::Armament(a), crate::item::ItemRef::Armament(b)) => {
                        a == b
                    }
                    (crate::item::ItemRef::Armor(a), crate::item::ItemRef::Armor(b)) => a == b,
                    (crate::item::ItemRef::Relic(a), crate::item::ItemRef::Relic(b)) => a == b,
                    _ => false,
                })
        })
        .count()
}

/// The id list trimmed to what ownership can cover, counted: the first
/// N configured copies of an asset survive when N are owned. None when
/// nothing changed.
fn trim_to_owned(ids: &[u32], mut owned_of: impl FnMut(u32) -> usize) -> Option<Vec<u32>> {
    let mut used: std::collections::HashMap<u32, usize> = std::collections::HashMap::new();
    let trimmed: Vec<u32> = ids
        .iter()
        .filter(|id| {
            let seen = used.entry(**id).or_insert(0);
            if *seen < owned_of(**id) {
                *seen += 1;
                true
            } else {
                false
            }
        })
        .copied()
        .collect();
    if trimmed.len() == ids.len() {
        None
    } else {
        Some(trimmed)
    }
}

/// INVALID ACTIONS LEAVE THE QUEUE before they progress — and only
/// where the queue CHANGED: every queue mutation flows through the
/// generated ActionStateComponent methods, which dirty the flag this
/// system consumes, so quiet entities cost nothing. An invalid active
/// or queued action is replaced by a renderable TargetLost event, never
/// silently dropped. (Late invalidation — a target dying after the last
/// queue change — is caught at resolution instead, as ActionFailed.)
pub fn action_validation_system(ecs: Ecs) {
    let dirty_entity_ids: Vec<u64> = ecs
        .iter_action_queue_dirty()
        .map(|f| f.entity_id())
        .collect();
    for entity_id in dirty_entity_ids {
        let handle = ecs.find(entity_id);
        if let Some(a) = handle.action_state() {
            if !handle.can_target_other(a.target_entity_id, a.action_id) {
                ecs.db.observable_events().insert(ecs.new_event(
                    entity_id,
                    EventType::TargetLost(a.action_id),
                    a.target_entity_id,
                ));
                ecs.find(entity_id).delete_action_state();
            }
        }
        let handle = ecs.find(entity_id);
        if let Some(queue) = handle.action_queue() {
            let (valid, invalid): (Vec<_>, Vec<_>) =
                queue.entries.into_iter().partition(|entry| {
                    ecs.find(entity_id)
                        .can_target_other(entry.target_entity_id, entry.action_id)
                });
            for entry in invalid {
                ecs.db.observable_events().insert(ecs.new_event(
                    entity_id,
                    EventType::TargetLost(entry.action_id),
                    entry.target_entity_id,
                ));
            }
            if valid.len() != { ecs.find(entity_id).action_queue() }
                .map_or(0, |q| q.entries.len())
            {
                if valid.is_empty() {
                    ecs.find(entity_id).delete_action_queue();
                } else {
                    ecs.find(entity_id).upsert_new_action_queue(valid);
                }
            }
        }
        // The sweep consumes the flag (the deletions above re-dirty it;
        // clearing LAST keeps one sweep per change).
        ecs.find(entity_id).delete_action_queue_dirty();
    }
}

/// EQUIPPED GEAR RIDES THE BODY'S EXTERIOR: worn and wielded items sit
/// at (carrier, Exterior) — the visible surface — while pocketed gear
/// stays at (carrier, Interior). SYSTEM-IMPOSED, watching the same
/// dirty flag every equipment change already raises (and running
/// BEFORE the stats derivation consumes it): the counted-first-N
/// instances of each worn asset, in stable entity order, go exterior;
/// the rest interior. Inventory checks match the id alone, so both
/// kinds count as carried.
pub fn gear_location_system(ecs: Ecs) {
    for f in ecs.iter_equipment_stat_block_dirty_flag() {
        let handle = f.into_handle();
        let owner_entity_id = handle.entity_id();
        let Some(equipment) = handle.equipment() else {
            continue;
        };
        // The worn multiset, keyed by gear kind + asset id.
        let mut worn: std::collections::HashMap<(u8, u32), usize> =
            std::collections::HashMap::new();
        for id in &equipment.armament_ids {
            *worn.entry((0, *id)).or_insert(0) += 1;
        }
        if let Some(armor_id) = equipment.worn_armor_id {
            *worn.entry((1, armor_id)).or_insert(0) += 1;
        }
        for id in &equipment.worn_relic_ids {
            *worn.entry((2, *id)).or_insert(0) += 1;
        }
        // Carried gear in stable entity order — the same counted order
        // every menu highlight uses.
        let mut carried: Vec<_> = ecs
            .db
            .location_components()
            .location_entity_id()
            .filter(owner_entity_id)
            .collect();
        carried.sort_unstable_by_key(|row| row.entity_id);
        for mut row in carried {
            let Some(item) = ecs.db.item_components().entity_id().find(row.entity_id)
            else {
                continue;
            };
            let key = match item.item_ref {
                crate::item::ItemRef::Armament(id) => (0u8, id),
                crate::item::ItemRef::Armor(id) => (1u8, id),
                crate::item::ItemRef::Relic(id) => (2u8, id),
                crate::item::ItemRef::QuestItem(_) => continue,
            };
            let remaining = worn.get_mut(&key);
            let kind = match remaining {
                Some(count) if *count > 0 => {
                    *count -= 1;
                    LocationKind::Exterior
                }
                _ => LocationKind::Interior,
            };
            if row.kind != kind {
                row.kind = kind;
                ecs.db.location_components().entity_id().update(row);
            }
        }
    }
}

/// CONFIGURATIONS FOLLOW THE INVENTORY: gear that leaves the bags leaves
/// every configuration naming it, trimmed by the counted rule (two
/// configured clubs need two owned clubs). Runs BEFORE reconciliation,
/// so the auto-equip only ever converges toward a satisfiable intent.
/// PLAYERS only: NPC gear is authored as pure asset references with no
/// item entities behind it — their configurations are their supply.
pub fn configuration_sanitation_system(ecs: Ecs) {
    for p in ecs.iter_player_controller() {
        let handle = p.into_handle();
        let entity_id = handle.entity_id();
        let owned_armament =
            |id: u32| owned_gear_count(ecs, entity_id, &crate::item::ItemRef::Armament(id));
        if let Some(defaults) = handle.default_armaments() {
            if let Some(trimmed) = trim_to_owned(&defaults.armament_ids, owned_armament) {
                ecs.find(entity_id).upsert_new_default_armaments(trimmed);
            }
        }
        if let Some(loadouts) = handle.stance_loadouts() {
            let mut assignments = loadouts.assignments;
            let mut changed = false;
            for assignment in &mut assignments {
                if let Some(override_ids) = &assignment.armament_ids {
                    if let Some(trimmed) = trim_to_owned(override_ids, owned_armament) {
                        assignment.armament_ids = Some(trimmed);
                        changed = true;
                    }
                }
            }
            if changed {
                ecs.find(entity_id).upsert_new_stance_loadouts(assignments);
            }
        }
        if let Some(armor) = handle.armor() {
            if owned_gear_count(ecs, entity_id, &crate::item::ItemRef::Armor(armor.armor_id))
                == 0
            {
                ecs.find(entity_id).delete_armor();
            }
        }
        if let Some(relics) = handle.relics() {
            let owned_relic =
                |id: u32| owned_gear_count(ecs, entity_id, &crate::item::ItemRef::Relic(id));
            if let Some(trimmed) = trim_to_owned(&relics.relic_ids, owned_relic) {
                ecs.find(entity_id).upsert_new_relics(trimmed);
            }
        }
    }
}

/// Order-insensitive multiset equality over asset id lists: two id lists
/// hold the same gear regardless of ordering.
fn armament_multisets_match(a: &[u32], b: &[u32]) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let mut left = a.to_vec();
    let mut right = b.to_vec();
    left.sort_unstable();
    right.sort_unstable();
    left == right
}

/// CONSISTENCY IS SYSTEM-IMPOSED: equipment (the canonical worn/wielded
/// reality) converges to the configurations here, never inside every
/// mutator. Entities with an equipment component and an action
/// controller whose reality diverges from their resolved configuration
/// get the registered RE-ARM action forced into their queue slot — IFF
/// no matching action is already queued or in progress; an in-progress
/// action finishes first. Intentional paths (stance changes, the
/// equip/unequip acts) converge immediately themselves, so this fires
/// only for menu-driven configuration changes. A FORCED stance
/// (intimidation, dive) carries the stance_forced flag and is skipped:
/// a forced posture never re-arms the hands.
pub fn equipment_reconciliation_system(ecs: Ecs) {
    let Some(rearm) = ecs
        .db
        .special_actions()
        .key()
        .find(SpecialActionKey::Rearm)
    else {
        // No registered re-arm: configurations still apply, and the
        // intentional paths still converge — only the forced round is
        // unavailable.
        return;
    };
    for e in ecs.iter_equipment() {
        let handle = e.into_handle();
        let entity_id = handle.entity_id();
        let Some(equipment) = handle.equipment() else {
            continue;
        };
        if handle.player_controller().is_none() && handle.enemy_controller().is_none() {
            continue;
        }
        // The dead do not re-arm; a forced posture holds the hands as
        // they were.
        if handle.hp().is_some_and(|hp| hp.hp <= 0) {
            continue;
        }
        if handle.stance_forced().is_some() {
            continue;
        }
        // Only CONFIGURATION carriers: flat authored equipment with no
        // config is not a divergence.
        let has_configuration = handle.stance_loadouts().is_some()
            || handle.default_armaments().is_some()
            || handle.armor().is_some()
            || handle.relics().is_some();
        if !has_configuration {
            continue;
        }
        // PER KIND, mirroring apply_resolved_equipment: a kind with no
        // configuration keeps its current canonical state.
        let has_armament_config =
            handle.stance_loadouts().is_some() || handle.default_armaments().is_some();
        let intent_armaments = if has_armament_config {
            handle.resolved_armament_ids()
        } else {
            equipment.armament_ids.clone()
        };
        let intent_armor = handle.armor().map(|a| a.armor_id);
        let intent_relics = handle.relics().map(|r| r.relic_ids).unwrap_or_default();
        if armament_multisets_match(&equipment.armament_ids, &intent_armaments)
            && equipment.worn_armor_id == intent_armor
            && armament_multisets_match(&equipment.worn_relic_ids, &intent_relics)
        {
            continue;
        }
        // Already converging? One matching action suffices (the enqueue
        // below also deduplicates by action id).
        let already_active = { handle.action_state() }
            .is_some_and(|a| a.action_id == rearm.action_id);
        if already_active {
            continue;
        }
        // AUTOMATIC entry at the FRONT of the queue: it cuts ahead of the
        // manual entry without displacing it, and the in-progress action
        // still finishes first.
        ecs.find(entity_id)
            .enqueue_automatic_action(rearm.action_id, entity_id);
    }
}

/// Visits derive from PRESENCE: any player-controlled entity standing in a
/// location is recorded as having visited it — one predicate covering every
/// way of arriving (moves, dives, respawns, future teleports), forever.
pub fn visited_location_system(ecs: Ecs) {
    for p in ecs.iter_player_controller().with_location() {
        crate::visited::record_visit(ecs, p.entity_id(), p.location().location_entity_id);
    }
}

pub fn enemy_control_system(ecs: Ecs) {
    // TODO Build cache of players-by-location.
    let mut players: Vec<_> = ecs.iter_player_controller().with_location().collect();
    let mut player_shuffle_rng = ecs.rng();
    for e in ecs.iter_enemy_controller().with_location().with_actions() {
        if e.action_state().is_some() {
            continue;
        }
        // A corpse keeps its controller (dormant will) but never acts.
        if { e.hp() }.is_some_and(|hp| hp.hp <= 0) {
            continue;
        }

        let mut p = None;
        players.shuffle(&mut player_shuffle_rng);
        for t in &players {
            if t.location().location_entity_id == e.location().location_entity_id
                && t.location().kind == e.location().kind
            {
                p = Some(t);
                break;
            }
        }
        let target_entity_id = if let Some(p) = p {
            p.entity_id()
        } else {
            continue;
        };
        // TODO Select action.
        let action_id = if let Some(a) = e.actions().action_ids.first() {
            a
        } else {
            break;
        };

        e.clone()
            .enqueue_manual_action(*action_id, target_entity_id);
    }
}

pub fn execute_all_systems(ecs: Ecs) {
    // Configurations are sanitized against the inventory FIRST, then
    // reconciliation converges equipment toward the (now satisfiable)
    // intent, claiming the queue slot before this tick's actions shift —
    // the exact timing control system ordering buys us.
    configuration_sanitation_system(ecs);
    equipment_reconciliation_system(ecs);
    gear_location_system(ecs);
    action_validation_system(ecs);
    actionless_stamp_system(ecs);
    crate::turn::turn_pause_system(ecs);
    action_system(ecs);
    // Mirror shared-HP deltas onto partners BEFORE the deltas settle, so both
    // halves of a crossing take the same blow this same tick.
    hp_share_system(ecs);
    hp_system(ecs);
    death_system(ecs);
    respawn_system(ecs);
    ep_system(ecs);
    shift_queued_action_system(ecs);
    entity_deletion_timer_system(ecs);
    player_deactivation_timer_system(ecs);
    entity_stats_system(ecs);
    player_provision_system(ecs);
    visited_location_system(ecs);
    player_activation_system(ecs);
    map_demand_system(ecs);
    enemy_control_system(ecs);
}

#[cfg(test)]
mod tests {
    use super::{armament_multisets_match, trim_to_owned};

    #[test]
    fn multisets_match_regardless_of_order_never_of_count() {
        assert!(armament_multisets_match(&[1, 2, 2], &[2, 1, 2]));
        assert!(armament_multisets_match(&[], &[]));
        assert!(!armament_multisets_match(&[1, 2], &[1, 2, 2]));
        assert!(!armament_multisets_match(&[1], &[2]));
    }

    #[test]
    fn trimming_keeps_the_first_owned_copies_and_reports_no_change() {
        // Two clubs configured, one owned: the first survives.
        assert_eq!(
            trim_to_owned(&[7, 7, 9], |id| if id == 7 { 1 } else { 1 }),
            Some(vec![7, 9])
        );
        // Fully covered: no change proposed at all.
        assert_eq!(trim_to_owned(&[7, 9], |_| 2), None);
        // Nothing owned: everything trims away.
        assert_eq!(trim_to_owned(&[7, 9], |_| 0), Some(vec![]));
    }
}
