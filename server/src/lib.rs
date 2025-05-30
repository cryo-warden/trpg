use std::cmp::{max, min};

use action::{ActionHandle, ActionType};
use entity::{
    action_option_components, action_state_component_targets, action_state_components,
    hp_components, location_components, queued_action_state_components, ActionOptionComponent,
    Entity, EntityHandle, InactiveEntityHandle,
};
use event::{
    early_event_targets, early_events, late_event_targets, late_events, observable_event_targets,
    observable_events, Event, EventType,
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

    ActionHandle::new(ctx, ActionType::Move)
        .set_name("quick_move")
        .add_move();

    EntityHandle::new(ctx);
    let allegiance2 = EntityHandle::new(ctx);
    let room = EntityHandle::new(ctx);
    let room2 = EntityHandle::new(ctx);
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
pub fn identity_connected(ctx: &ReducerContext) {
    match EntityHandle::from_player_identity(ctx) {
        Some(_) => {
            // TODO Remove logout timer.
        }
        None => match InactiveEntityHandle::from_player_identity(ctx) {
            Some(h) => {
                h.activate();
            }
            None => Entity::new_player(ctx),
        },
    }
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(_ctx: &ReducerContext) {
    // TODO Add a timer to deactivate player. Remove this timer in identity_connected.
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

    for event in ctx.db.late_events().iter() {
        for target in ctx.db.late_event_targets().event_id().filter(event.id) {
            event.resolve(ctx, target.target_entity_id);
        }
        ctx.db.late_event_targets().event_id().delete(event.id);
        ctx.db.late_events().id().delete(event.id);
    }
}

pub fn hp_system(ctx: &ReducerContext) {
    for mut hp in ctx.db.hp_components().iter() {
        hp.hp = max(
            0,
            min(
                hp.mhp,
                hp.hp + hp.accumulated_healing - hp.accumulated_damage,
            ),
        );
        hp.accumulated_healing = 0;
        hp.accumulated_damage = 0;
        ctx.db.hp_components().entity_id().update(hp);
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

// TODO Resolve buffs before attacks to reward perfect defense timing.
pub fn action_system(ctx: &ReducerContext) {
    for mut action_state in ctx.db.action_state_components().iter() {
        let entity_id = action_state.entity_id;
        let action_handle = ActionHandle::from_id(ctx, action_state.action_id);

        let effect = action_handle.effect(action_state.sequence_index);
        match effect {
            None => {}
            Some(effect) => {
                Event::emit_late(
                    ctx,
                    entity_id,
                    EventType::ActionEffect(effect),
                    ctx.db
                        .action_state_component_targets()
                        .action_state_component_id()
                        .filter(action_state.id)
                        .map(|t| t.target_entity_id),
                );
            }
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

pub fn action_option_system(ctx: &ReducerContext) {
    for action_option_component in ctx.db.action_option_components().iter() {
        ctx.db
            .action_option_components()
            .delete(action_option_component);
    }
    for location_component in ctx.db.location_components().iter() {
        let e = EntityHandle::from_id(ctx, location_component.entity_id);
        for other_location_component in ctx
            .db
            .location_components()
            .location_entity_id()
            .filter(location_component.location_entity_id)
        {
            let t = EntityHandle::from_id(ctx, other_location_component.entity_id);
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

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    observable_event_reset_system(ctx);
    action_system(ctx);
    event_resolve_system(ctx);
    hp_system(ctx);
    shift_queued_action_system(ctx);
    action_option_system(ctx);

    Ok(())
}
