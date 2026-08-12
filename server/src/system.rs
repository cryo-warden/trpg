use crate::{
    action::{ActionEffect, ActionHandle},
    asset::{
        baseline::baselines, location_map::location_maps, r#trait::traits, stat_block::StatBlock,
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

        for effect in &effects {
            match effect {
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

    for f in ecs.iter_total_stat_block_dirty_flag() {
        log::debug!("Entity {} is computing total stat block.", f.entity_id());
        let mut stat_block = { f.baseline() }
            .and_then(|b| ecs.db.baselines().id().find(b.baseline_id))
            .map_or_else(|| StatBlock::default(), |b| b.stat_block);

        if let Some(t) = f.traits_stat_block_cache() {
            stat_block += &t.stat_block;
        }

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
