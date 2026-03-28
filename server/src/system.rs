use crate::{
    action::{ActionEffect, ActionHandle},
    entity::*,
    event::{observable_events, EventQueue, EventType, NewEvent},
    stat_block::{baselines, traits, StatBlock},
};
use ecs::Ecs;
use spacetimedb::Table;
use std::cmp::{max, min};

pub fn observation_reset_system(ecs: Ecs) {
    for event in ecs.db.observable_events().iter() {
        ecs.db.observable_events().delete(event);
    }
}

pub fn hp_system(ecs: Ecs) {
    for mut e in ecs.iter_hp() {
        let hp = e.hp_mut();
        hp.hp = max(
            0,
            min(
                hp.mhp,
                hp.hp + hp.accumulated_healing - hp.accumulated_damage,
            ),
        );
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
        if e.action_state().is_none() {
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

        let effect = action_handle.effect(action_state.sequence_index);
        if let Some(ref effect) = effect {
            match effect {
                ActionEffect::Buff(_) => {
                    queue.emit_early(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    ));
                }
                ActionEffect::Attack(damage) => {
                    let attack = e.attack().map(|c| c.attack).unwrap_or(0);
                    let t = ecs.find(action_state.target_entity_id);
                    let target_defense = t.hp().map(|c| c.defense).unwrap_or(0);
                    queue.emit_middle(ecs.new_event(
                        entity_id,
                        EventType::ActionEffect(ActionEffect::Attack(max(
                            0,
                            damage + attack - target_defense,
                        ))),
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

        let effect = action_handle.effect(new_sequence_index);
        if effect.is_none() {
            // TODO Emit event for finished action.
            with_action_state.delete_action_state();
        }
    }

    queue.resolve(ecs);
}

pub fn entity_prominence_system(ecs: Ecs) {
    for p in ecs.iter_entity_prominence() {
        p.delete_entity_prominence();
    }
    for entity in ecs.db.entities().iter() {
        ecs.find(entity.id).generate_prominence();
    }
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
        log::debug!("Entity {} is computing traits stat block.", f.entity_id());
        if let Some(c) = ecs.find(f.entity_id()).with_traits() {
            let mut stat_block = StatBlock::default();
            for id in &c.traits().trait_ids {
                if let Some(t) = ecs.db.traits().id().find(id) {
                    stat_block += &t.stat_block;
                }
            }

            f.upsert_new_total_stat_block_dirty_flag()
                .upsert_new_traits_stat_block_cache(stat_block)
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

pub fn execute_all_systems(ecs: Ecs) {
    observation_reset_system(ecs);
    action_system(ecs);
    hp_system(ecs);
    ep_system(ecs);
    shift_queued_action_system(ecs);
    entity_prominence_system(ecs);
    entity_deletion_timer_system(ecs);
    player_deactivation_timer_system(ecs);
    entity_stats_system(ecs);
}
