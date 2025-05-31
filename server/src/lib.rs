use std::cmp::{max, min};

use action::{ActionEffect, ActionHandle, ActionType};
use entity::{
    action_option_components, action_state_component_targets, action_state_components, entities,
    entity_deactivation_timers, entity_prominences, ep_components, hp_components,
    location_components, queued_action_state_components, target_components, ActionOptionComponent,
    Entity, EntityDeactivationTimer, EntityHandle, InactiveEntityHandle,
};
use event::{
    early_event_targets, early_events, late_event_targets, late_events, middle_event_targets,
    middle_events, observable_event_targets, observable_events, Event, EventType,
};
use spacetimedb::{reducer, table, ReducerContext, Table, TimeDuration};

mod action;
mod entity;
mod event;

#[reducer(init)]
pub fn init(ctx: &ReducerContext) {
    ctx.db.system_timers().insert(SystemTimer {
        scheduled_id: 0,
        scheduled_at: spacetimedb::ScheduleAt::Interval(TimeDuration::from_micros(1000000)),
    });

    ActionHandle::new(ctx, ActionType::Move)
        .set_name("quick_move")
        .add_move();

    ActionHandle::new(ctx, ActionType::Buff)
        .set_name("divine_heal")
        .add_heal(100);

    ActionHandle::new(ctx, ActionType::Attack)
        .set_name("bop")
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest();

    ActionHandle::new(ctx, ActionType::Attack)
        .set_name("boppity_bop")
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_rest();

    EntityHandle::new(ctx).set_name("allegiance1");
    let allegiance2 = EntityHandle::new(ctx).set_name("allegiance2");
    let room = EntityHandle::new(ctx).set_name("room1");
    let room2 = EntityHandle::new(ctx).set_name("room2");
    EntityHandle::new(ctx)
        .add_location(room2.entity_id)
        .add_path(room.entity_id);
    EntityHandle::new(ctx)
        .add_location(room.entity_id)
        .add_path(room2.entity_id);
    for _ in 0..5 {
        EntityHandle::new(ctx)
            .set_allegiance(allegiance2.entity_id)
            .add_hp(10)
            .add_location(room.entity_id);
    }
}

#[reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) -> Result<(), String> {
    match EntityHandle::from_player_identity(ctx) {
        Some(e) => {
            ctx.db
                .entity_deactivation_timers()
                .entity_id()
                .delete(e.entity_id);
        }
        None => match InactiveEntityHandle::from_player_identity(ctx) {
            Some(h) => {
                h.activate();
            }
            None => {
                Entity::new_player(ctx)?;
            }
        },
    }

    Ok(())
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    match EntityHandle::from_player_identity(ctx) {
        None => {}
        Some(e) => {
            if ctx
                .db
                .entity_deactivation_timers()
                .entity_id()
                .find(e.entity_id)
                .is_none()
            {
                match ctx
                    .timestamp
                    .checked_add(TimeDuration::from_micros(30000000))
                {
                    None => {}
                    Some(timestamp) => {
                        ctx.db
                            .entity_deactivation_timers()
                            .insert(EntityDeactivationTimer {
                                entity_id: e.entity_id,
                                timestamp,
                            });
                    }
                }
            }
        }
    }
}

#[reducer]
pub fn act(ctx: &ReducerContext, action_id: u64, target_entity_id: u64) -> Result<(), String> {
    match EntityHandle::from_player_identity(ctx) {
        Some(p) => {
            if p.can_target_other(target_entity_id, action_id) {
                p.set_queued_action_state(action_id)
                    .add_queued_action_state_target(target_entity_id);
                Ok(())
            } else {
                Err("Invalid target for the given action.".to_string())
            }
        }
        None => Err("Cannot find a player entity.".to_string()),
    }
}

#[reducer]
pub fn target(ctx: &ReducerContext, target_entity_id: u64) -> Result<(), String> {
    match EntityHandle::from_player_identity(ctx) {
        Some(p) => {
            p.set_target(target_entity_id);
            // TODO Only update for the given player and target.
            action_option_system(ctx);
            Ok(())
        }
        None => Err("Cannot find a player entity.".to_string()),
    }
}

#[reducer]
pub fn delete_target(ctx: &ReducerContext) -> Result<(), String> {
    match EntityHandle::from_player_identity(ctx) {
        Some(p) => {
            p.delete_target();
            Ok(())
        }
        None => Err("Cannot find a player entity.".to_string()),
    }
}

#[reducer]
pub fn damage(ctx: &ReducerContext, entity_id: u64, damage: i32) -> Result<(), String> {
    let mut hp = ctx
        .db
        .hp_components()
        .entity_id()
        .find(entity_id)
        .ok_or("Cannot find entity.")?;
    hp.accumulated_damage += damage;
    ctx.db.hp_components().entity_id().update(hp);

    Ok(())
}

#[table(name = system_timers, scheduled(run_system))]
pub struct SystemTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: spacetimedb::ScheduleAt,
}

pub fn observable_event_reset_system(ctx: &ReducerContext) {
    for event in ctx.db.observable_events().iter() {
        ctx.db
            .observable_event_targets()
            .event_id()
            .delete(event.id);
        ctx.db.observable_events().id().delete(event.id);
    }
}

pub fn event_resolve_system(ctx: &ReducerContext) {
    for event in ctx.db.early_events().iter() {
        for target in ctx.db.early_event_targets().event_id().filter(event.id) {
            event.resolve(ctx, target.target_entity_id);
        }
        ctx.db.early_event_targets().event_id().delete(event.id);
        ctx.db.early_events().id().delete(event.id);
    }

    for event in ctx.db.middle_events().iter() {
        for target in ctx.db.middle_event_targets().event_id().filter(event.id) {
            event.resolve(ctx, target.target_entity_id);
        }
        ctx.db.middle_event_targets().event_id().delete(event.id);
        ctx.db.middle_events().id().delete(event.id);
    }

    for event in ctx.db.late_events().iter() {
        for target in ctx.db.late_event_targets().event_id().filter(event.id) {
            event.resolve(ctx, target.target_entity_id);
        }
        ctx.db.late_event_targets().event_id().delete(event.id);
        ctx.db.late_events().id().delete(event.id);
    }
}

pub fn hp_system(ctx: &ReducerContext) {
    for mut hp_component in ctx.db.hp_components().iter() {
        hp_component.hp = max(
            0,
            min(
                hp_component.mhp,
                hp_component.hp + hp_component.accumulated_healing
                    - hp_component.accumulated_damage,
            ),
        );
        hp_component.accumulated_healing = 0;
        hp_component.accumulated_damage = 0;
        ctx.db.hp_components().entity_id().update(hp_component);
    }
}

pub fn ep_system(ctx: &ReducerContext) {
    for mut ep_component in ctx.db.ep_components().iter() {
        ep_component.ep = max(0, min(ep_component.mep, ep_component.ep));
        ctx.db.ep_components().entity_id().update(ep_component);
    }
}

pub fn shift_queued_action_system(ctx: &ReducerContext) {
    for q in ctx.db.queued_action_state_components().iter() {
        let e = EntityHandle::from_id(ctx, q.entity_id);
        if e.action_state_component().is_none() {
            e.shift_queued_action_state();
        }
    }
}

pub fn action_system(ctx: &ReducerContext) {
    for mut action_state in ctx.db.action_state_components().iter() {
        let entity_id = action_state.entity_id;
        let action_handle = ActionHandle::from_id(ctx, action_state.action_id);

        let target_ids = ctx
            .db
            .action_state_component_targets()
            .action_state_component_id()
            .filter(action_state.id)
            .map(|t| t.target_entity_id);
        let effect = action_handle.effect(action_state.sequence_index);
        match effect {
            None => {}
            Some(effect) => match effect {
                ActionEffect::Buff(_) => {
                    Event::emit_early(ctx, entity_id, EventType::ActionEffect(effect), target_ids);
                }
                ActionEffect::Attack(_) | ActionEffect::Heal(_) => {
                    Event::emit_middle(ctx, entity_id, EventType::ActionEffect(effect), target_ids);
                }
                _ => {
                    Event::emit_late(ctx, entity_id, EventType::ActionEffect(effect), target_ids);
                }
            },
        }

        action_state.sequence_index += 1;
        let new_sequence_index = action_state.sequence_index;
        let action_state_component_id = action_state.id;

        ctx.db
            .action_state_components()
            .entity_id()
            .update(action_state);

        let effect = action_handle.effect(new_sequence_index);
        match effect {
            Some(_) => {}
            None => {
                // TODO Emit event for finished action.
                ctx.db
                    .action_state_components()
                    .entity_id()
                    .delete(entity_id);
                ctx.db
                    .action_state_component_targets()
                    .action_state_component_id()
                    .delete(action_state_component_id);
            }
        }
    }
}

pub fn target_validation_system(ctx: &ReducerContext) {
    for target_component in ctx.db.target_components().iter() {
        let e = EntityHandle::from_id(ctx, target_component.entity_id);
        let t = EntityHandle::from_id(ctx, target_component.target_entity_id);
        let is_valid = match t.location() {
            None => false,
            Some(tl) => {
                tl == e.entity_id
                    || match e.location() {
                        None => false,
                        Some(el) => tl == el,
                    }
            }
        };

        if !is_valid {
            e.delete_target();
        }
    }
}

pub fn action_option_system(ctx: &ReducerContext) {
    for action_option_component in ctx.db.action_option_components().iter() {
        ctx.db
            .action_option_components()
            .delete(action_option_component);
    }
    for location_component in ctx.db.location_components().iter() {
        let e = EntityHandle::from_id(ctx, location_component.entity_id);
        for other_entity_id in match e.target() {
            None => vec![e.entity_id],
            Some(target) => vec![e.entity_id, target],
        } {
            let t = EntityHandle::from_id(ctx, other_entity_id);
            for action_id in e.actions() {
                if e.can_target_other(t.entity_id, action_id) {
                    ctx.db
                        .action_option_components()
                        .insert(ActionOptionComponent {
                            action_id,
                            entity_id: e.entity_id,
                            target_entity_id: t.entity_id,
                        });
                }
            }
        }
    }
}

pub fn entity_prominence_system(ctx: &ReducerContext) {
    for p in ctx.db.entity_prominences().iter() {
        ctx.db.entity_prominences().delete(p);
    }
    for entity in ctx.db.entities().iter() {
        EntityHandle::from_id(ctx, entity.id).generate_prominence();
    }
}

pub fn entity_deactivation_system(ctx: &ReducerContext) {
    for t in ctx.db.entity_deactivation_timers().iter() {
        if t.timestamp.le(&ctx.timestamp) {
            EntityHandle::from_id(ctx, t.entity_id).deactivate();
            ctx.db.entity_deactivation_timers().delete(t);
        }
    }
}

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    observable_event_reset_system(ctx);
    action_system(ctx);
    event_resolve_system(ctx);
    hp_system(ctx);
    ep_system(ctx);
    shift_queued_action_system(ctx);
    target_validation_system(ctx);
    action_option_system(ctx);
    entity_prominence_system(ctx);
    entity_deactivation_system(ctx);

    Ok(())
}
