use std::cmp::{max, min};

use action::ActionHandle;
use entity::{
    action_state_component_targets, action_state_components, hp_components, EntityHandle,
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
        scheduled_at: spacetimedb::ScheduleAt::Interval(TimeDuration::from_micros(500000)),
    });

    ActionHandle::new(ctx)
        .set_name("bop")
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest();

    ActionHandle::new(ctx)
        .set_name("boppity_bop")
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_rest();

    let ab = ActionHandle::from_id(ctx, 1);
    let mut i = 0;
    let mut oe = ab.effect(i);
    while let Some(e) = oe {
        log::debug!("action {} effect {} is {:?}", 1, i, e);
        i += 1;
        oe = ab.effect(i);
    }

    let ab = ActionHandle::from_id(ctx, 2);
    let mut i = 0;
    let mut oe = ab.effect(i);
    while let Some(e) = oe {
        log::debug!("action {} effect {} is {:?}", 2, i, e);
        i += 1;
        oe = ab.effect(i);
    }

    let e1 = EntityHandle::new(ctx).add_hp(10).add_action_state(2);
    let e2 = EntityHandle::new(ctx).add_hp(10);
    e1.add_action_state_target(e2.entity_id);
}

#[reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {}

#[reducer(client_disconnected)]
pub fn identity_disconnected(_ctx: &ReducerContext) {}

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

// TODO Resolve buffs before attacks to reward perfect defense timing.
pub fn action_system(ctx: &ReducerContext) {
    for mut action_state in ctx.db.action_state_components().iter() {
        let entity_id = action_state.entity_id;
        let action_builder = ActionHandle::from_id(ctx, action_state.action_id);

        let effect = action_builder.effect(action_state.sequence_index);
        match effect {
            None => {}
            Some(effect) => {
                ctx.db.late_events().insert(Event {
                    id: 0,
                    time: ctx.timestamp,
                    owner_entity_id: entity_id,
                    event_type: EventType::ActionEffect(effect),
                });
            }
        }

        action_state.sequence_index += 1;
        let new_sequence_index = action_state.sequence_index;
        let action_state_component_id = action_state.id;

        ctx.db
            .action_state_components()
            .entity_id()
            .update(action_state);

        let effect = action_builder.effect(new_sequence_index);
        match effect {
            Some(_) => {}
            None => {
                // TODO Emit event for finished action.
                log::debug!("entity {} finished action", entity_id);
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

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    observable_event_reset_system(ctx);
    action_system(ctx);
    event_resolve_system(ctx);
    hp_system(ctx);

    Ok(())
}
