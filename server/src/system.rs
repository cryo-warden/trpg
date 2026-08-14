use crate::{
    account::accounts,
    action::{action_rounds, actions, ActionEffect, ActionHandle},
    asset::ReducerContextExtension,
    asset::{
        armament::armaments,
        armor::armors,
        location_map::{location_map_connections, location_maps},
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
    for e in ecs.iter_hp() {
        if e.hp().hp > 0 {
            continue;
        }
        let handle = e.into_handle();
        if handle.player_controller().is_some() && handle.respawn_timer().is_some() {
            // Already dead and waiting; the respawn system handles the rest.
            continue;
        }
        if handle.action_state().is_some() {
            handle.delete_action_state();
        }
        if handle.queued_action_state().is_some() {
            handle.delete_queued_action_state();
        }
        if handle.player_controller().is_some() {
            handle.upsert_new_respawn_timer(
                ecs.timestamp
                    + spacetimedb::TimeDuration::from_micros(RESPAWN_DELAY_MICROS),
            );
        }
        // A dead NPC becomes a CORPSE, never a deletion: the entity remains
        // — its name stays in every message about what happened, and the
        // body is there to see (and to target). The enemy controller also
        // REMAINS, dormant: it marks "combatant, not scenery", so the
        // client's threat panel keeps the fallen where they fell instead of
        // reshuffling mid-fight. enemy_control_system skips the dead.
        // Map-instance cleanup eventually sweeps corpse and controller with
        // the room.
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
                    handle.clone().upsert_new_location(room_entity_id);
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
            map.generate_entities(ecs)?.checkpoint_room_entity_ids
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

pub fn shift_queued_action_system(ecs: Ecs) {
    for e in ecs.iter_queued_action_state() {
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
            let e = e.into_handle().shift_queued_action_state();
            if let Some(a) = e.action_state() {
                if e.can_target_other(a.target_entity_id, a.action_id) {
                    ecs.db.observable_events().insert(ecs.new_event(
                        a.entity_id,
                        EventType::StartAction(a.action_id),
                        a.target_entity_id,
                    ));
                } else {
                    log::warn!(
                        "Entity {} has invalid queued action target {} for action {}",
                        e.entity_id(),
                        a.target_entity_id,
                        a.action_id
                    );
                    e.delete_action_state();
                }
            }
        }
    }
}

pub fn action_system(ecs: Ecs) {
    let mut queue = EventQueue::new();
    for mut e in ecs.iter_action_state() {
        let action_state = e.action_state();
        let entity_id = action_state.entity_id;
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
                ActionEffect::Heal(_) => {
                    queue.emit_middle(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
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

pub fn entity_deletion_timer_system(ecs: Ecs) {
    for t in ecs.iter_entity_deletion_timer() {
        if t.entity_deletion_timer().timestamp <= ecs.timestamp {
            // Anything an entity carries has that entity as its location;
            // when the carrier is destroyed, the contents move out to the
            // carrier's own location. A carrier with no location strands its
            // contents — surface it rather than leave dangling references.
            let carried: Vec<_> = ecs
                .db
                .location_components()
                .location_entity_id()
                .filter(t.entity_id())
                .collect();
            let destination = t.location().map(|l| l.location_entity_id);
            for mut location_component in carried {
                match destination {
                    Some(destination) => {
                        location_component.location_entity_id = destination;
                        ecs.db
                            .location_components()
                            .entity_id()
                            .update(location_component);
                    }
                    None => {
                        log::error!(
                            "Entity {} was destroyed with no location; its contents ({}) are stranded.",
                            t.entity_id(),
                            location_component.entity_id
                        );
                    }
                }
            }
            crate::visited::cleanup_visited_rows(ecs, t.entity_id());
            t.delete();
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
        if let Some(c) = e.equipment() {
            for id in &c.armament_ids {
                if let Some(a) = ecs.db.armaments().id().find(id) {
                    stat_block += &a.stat_block;
                }
            }
        }
        if let Some(c) = e.armor() {
            if let Some(a) = ecs.db.armors().id().find(c.armor_id) {
                stat_block += &a.stat_block;
            }
        }
        if let Some(c) = e.relics() {
            for id in &c.relic_ids {
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

    for f in ecs.iter_total_stat_block_dirty_flag() {
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
        // TOTAL keeps its full grants (clients build candidate pools from
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
                match m.generate_entities(ecs) {
                    // WIP Add checkpoint location to select a specific room.
                    // WIP Consider adding rng seed to checkpoint to allow same map to regen.
                    Ok(map_generation_result) => {
                        if let Some(location_entity_id) =
                            map_generation_result.main_room_ids.first()
                        {
                            p.insert_new_location(*location_entity_id);
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
            map.generate_entities(ecs)?;
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
    // The path wears the EXIT map's theme.
    let exit_map = ecs
        .db
        .location_maps()
        .id()
        .find(connection.exit_location_map_id)
        .ok_or("unknown exit map")?;
    let path_blob = ecs
        .db
        .location_map_themes()
        .id()
        .find(exit_map.theme_id)
        .and_then(|theme| theme.paths_selector.sample(rng).map(|b| b.to_owned()));
    match path_blob {
        Some(blob) => {
            ecs.new_path(blob, room_entity_id, destination_room)?;
        }
        // A theme without path blobs still connects; the path is simply
        // featureless.
        None => {
            ecs.new()
                .upsert_new_location(room_entity_id)
                .into_handle()
                .upsert_new_path(destination_room);
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
            crate::visited::cleanup_visited_rows(ecs, path_entity_id);
            ecs.find(path_entity_id).delete();
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
            crate::visited::cleanup_visited_rows(ecs, entity_id);
            ecs.find(entity_id).delete();
        }
        crate::visited::cleanup_visited_rows(ecs, *room_id);
        ecs.find(*room_id).delete();
    }
    crate::visited::cleanup_visited_rows(ecs, map_entity_id);
    ecs.find(map_entity_id).delete();
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
            if t.location().location_entity_id == e.location().location_entity_id {
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
            .set_queued_action_state(*action_id, target_entity_id);
    }
}

pub fn execute_all_systems(ecs: Ecs) {
    action_system(ecs);
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
