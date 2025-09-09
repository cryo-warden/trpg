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

pub fn target_validation_system(ecs: Ecs) {
    for e in ecs.iter_target() {
        let t = ecs.find(e.target().target_entity_id);
        let is_valid = match t.location() {
            None => false,
            Some(tl) => {
                tl.location_entity_id == e.target().entity_id // WIP Make entity_id() trait.
                    || match e.location() {
                        None => false,
                        Some(el) => tl.location_entity_id == el.location_entity_id,
                    }
            }
        };

        if !is_valid {
            e.delete_target();
        }
    }
}

pub fn action_option_system(ecs: Ecs) {
    for e in ecs.iter_action_options() {
        e.delete_action_options();
    }
    for e in ecs.iter_location() {
        for other_entity_id in match e.target() {
            None => vec![e.entity_id()],
            Some(target) => {
                if e.entity_id() == target.target_entity_id {
                    vec![e.entity_id()]
                } else {
                    vec![e.entity_id(), target.target_entity_id]
                }
            }
        } {
            let mut e = e.clone().into_handle();
            for action_id in e.actions().into_iter().flat_map(|a| a.action_ids) {
                // WIP Take methods out of EntityHandle and onto component traits.
                if e.can_target_other(other_entity_id, action_id) {
                    e = e.add_action_option(action_id, other_entity_id);
                }
            }
        }
    }
}

pub fn entity_prominence_system(ecs: Ecs) {
    for p in ecs.iter_entity_prominence() {
        p.delete_entity_prominence();
    }
    for entity in ecs.db.entities().iter() {
        ecs.find(entity.id).generate_prominence();
    }
}

pub fn entity_deactivation_system(ecs: Ecs) {
    for t in ecs.iter_entity_deactivation_timer() {
        if t.entity_deactivation_timer().timestamp <= ecs.timestamp {
            let t = t.delete_entity_deactivation_timer();
            let _ = t.new_blob();
            // WIP Complete deactivation by moving blob into a new entity_blobs table.
            t.delete();
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
                .into_handle()
                .set_traits_stat_block_cache(stat_block);
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

        f.into_handle().apply_stat_block(stat_block);
    }
}
