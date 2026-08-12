use crate::{
    action::{actions, ActionEffect, ActionHandle},
    asset::{
        armament::armaments, armor::armors, location_map::location_maps, r#trait::traits,
        relic::relics, stance::stances, stat_block::StatBlock,
    },
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
        // the ActionsComponent. Swapping stances (or any stat change)
        // re-derives this through the same dirty flag.
        let total = stat_block.clone();
        stat_block.action_ids.retain(|id| {
            match ecs.db.actions().id().find(id) {
                Some(action) => total.meets(&action.requirements),
                None => {
                    log::error!("Granted action id {} has no action row.", id);
                    false
                }
            }
        });

        f.delete_total_stat_block_dirty_flag()
            .into_handle()
            .apply_stat_block(stat_block);
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

pub fn enemy_control_system(ecs: Ecs) {
    // TODO Build cache of players-by-location.
    let mut players: Vec<_> = ecs.iter_player_controller().with_location().collect();
    let mut player_shuffle_rng = ecs.rng();
    for e in ecs.iter_enemy_controller().with_location().with_actions() {
        if e.action_state().is_some() {
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
    ep_system(ecs);
    shift_queued_action_system(ecs);
    entity_deletion_timer_system(ecs);
    player_deactivation_timer_system(ecs);
    entity_stats_system(ecs);
    player_activation_system(ecs);
    enemy_control_system(ecs);
}
