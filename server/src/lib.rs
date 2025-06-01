use std::cmp::{max, min};

use action::{ActionEffect, ActionHandle, ActionName, ActionType};
use component::{
    action_options_components, action_state_components, attack_components, baseline_components,
    entity_deactivation_timer_components, entity_prominence_components, ep_components,
    hp_components, location_components, queued_action_state_components, target_components,
    traits_components, EntityDeactivationTimerComponent,
};
use entity::{entities, Entity, EntityHandle, InactiveEntityHandle};
use event::{early_events, late_events, middle_events, observable_events, Event, EventType};
use spacetimedb::{reducer, table, ReducerContext, ScheduleAt, Table, TimeDuration};
use stat_block::{baselines, traits, StatBlockBuilder, StatBlockContext};

mod action;
mod component;
mod entity;
mod event;
mod stat_block;

#[reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    ActionHandle::new(ctx, ActionType::Move)
        .set_name("quick_move")
        .add_move();

    ActionHandle::new(ctx, ActionType::Buff)
        .set_name("divine_heal")
        .add_heal(100);

    ActionHandle::new(ctx, ActionType::Move)
        .set_name("move")
        .add_rest()
        .add_rest()
        .add_move()
        .add_rest();

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

    StatBlockContext::new(ctx)
        .insert_baseline("human", StatBlockBuilder::default().mhp(5).mep(5))
        .insert_baseline(
            "slime",
            StatBlockBuilder::default()
                .attack(-1)
                .defense(-1)
                .mhp(3)
                .mep(2),
        )
        .insert_trait(
            "admin",
            &StatBlockBuilder::default().additive_action_ids(vec![
                ActionName::get_id(ctx, "quick_move"),
                ActionName::get_id(ctx, "divine_heal"),
            ]),
        )
        .insert_trait(
            "mobile",
            &StatBlockBuilder::default().additive_action_ids(vec![ActionName::get_id(ctx, "move")]),
        )
        .insert_trait("tiny", &StatBlockBuilder::default().attack(-1).mhp(-2))
        .insert_trait("small", StatBlockBuilder::default().mhp(-1))
        .insert_trait("big", StatBlockBuilder::default().mhp(2))
        .insert_trait("huge", StatBlockBuilder::default().attack(1).mhp(5));

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
            .set_baseline("slime")
            .add_location(room.entity_id);
    }

    ctx.db.system_timers().insert(SystemTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(TimeDuration::from_micros(1000000)),
    });

    Ok(())
}

#[reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) -> Result<(), String> {
    match EntityHandle::from_player_identity(ctx) {
        Some(e) => {
            ctx.db
                .entity_deactivation_timer_components()
                .entity_id()
                .delete(e.entity_id);
            log::debug!(
                "Reconnected {} to {} and removed deactivation timer.",
                ctx.sender,
                e.entity_id
            );
        }
        None => match InactiveEntityHandle::from_player_identity(ctx) {
            Some(h) => {
                let e = h.activate();
                log::debug!("Reactivated {} to {}.", ctx.sender, e.entity_id);
            }
            None => {
                let e = Entity::new_player(ctx)?;
                log::debug!("Connected {} to new player {}.", ctx.sender, e.entity_id);
            }
        },
    }

    Ok(())
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    match EntityHandle::from_player_identity(ctx) {
        None => {
            log::debug!("Disconnected {} but cannot find any player.", ctx.sender);
        }
        Some(e) => {
            if ctx
                .db
                .entity_deactivation_timer_components()
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
                        ctx.db.entity_deactivation_timer_components().insert(
                            EntityDeactivationTimerComponent {
                                entity_id: e.entity_id,
                                timestamp,
                            },
                        );
                        log::debug!(
                            "Disconnected {} from player {} and set deactivation timer.",
                            ctx.sender,
                            e.entity_id
                        );
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
                p.set_queued_action_state(action_id, target_entity_id);
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
        ctx.db.observable_events().id().delete(event.id);
    }
}

pub fn event_resolve_system(ctx: &ReducerContext) {
    for event in ctx.db.early_events().iter() {
        event.resolve(ctx);
        ctx.db.early_events().id().delete(event.id);
    }

    for event in ctx.db.middle_events().iter() {
        event.resolve(ctx);
        ctx.db.middle_events().id().delete(event.id);
    }

    for event in ctx.db.late_events().iter() {
        event.resolve(ctx);
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

        let effect = action_handle.effect(action_state.sequence_index);
        if let Some(ref effect) = effect {
            match effect {
                ActionEffect::Buff(_) => {
                    Event::emit_early(
                        ctx,
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    );
                }
                ActionEffect::Attack(damage) => {
                    let attack = ctx
                        .db
                        .attack_components()
                        .entity_id()
                        .find(entity_id)
                        .map(|c| c.attack)
                        .unwrap_or(0);
                    let target_defense = ctx
                        .db
                        .hp_components()
                        .entity_id()
                        .find(action_state.target_entity_id)
                        .map(|c| c.defense)
                        .unwrap_or(0);
                    Event::emit_middle(
                        ctx,
                        entity_id,
                        EventType::ActionEffect(ActionEffect::Attack(max(
                            0,
                            damage + attack - target_defense,
                        ))),
                        action_state.target_entity_id,
                    );
                }
                ActionEffect::Heal(_) => {
                    Event::emit_middle(
                        ctx,
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    );
                }
                _ => {
                    Event::emit_late(
                        ctx,
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    );
                }
            }
        }

        action_state.sequence_index += 1;
        let new_sequence_index = action_state.sequence_index;

        ctx.db
            .action_state_components()
            .entity_id()
            .update(action_state);

        let effect = action_handle.effect(new_sequence_index);
        if effect.is_none() {
            // TODO Emit event for finished action.
            ctx.db
                .action_state_components()
                .entity_id()
                .delete(entity_id);
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
    for action_option_component in ctx.db.action_options_components().iter() {
        ctx.db
            .action_options_components()
            .delete(action_option_component);
    }
    for location_component in ctx.db.location_components().iter() {
        let mut e = EntityHandle::from_id(ctx, location_component.entity_id);
        for other_entity_id in match e.target() {
            None => vec![e.entity_id],
            Some(target) => {
                if e.entity_id == target {
                    vec![e.entity_id]
                } else {
                    vec![e.entity_id, target]
                }
            }
        } {
            for action_id in e.actions() {
                if e.can_target_other(other_entity_id, action_id) {
                    e = e.add_action_option(action_id, other_entity_id);
                }
            }
        }
    }
}

pub fn entity_prominence_system(ctx: &ReducerContext) {
    for p in ctx.db.entity_prominence_components().iter() {
        ctx.db.entity_prominence_components().delete(p);
    }
    for entity in ctx.db.entities().iter() {
        EntityHandle::from_id(ctx, entity.id).generate_prominence();
    }
}

pub fn entity_deactivation_system(ctx: &ReducerContext) {
    for t in ctx.db.entity_deactivation_timer_components().iter() {
        if t.timestamp.le(&ctx.timestamp) {
            EntityHandle::from_id(ctx, t.entity_id).deactivate();
            ctx.db.entity_deactivation_timer_components().delete(t);
        }
    }
}

pub fn entity_stats_system(ctx: &ReducerContext) {
    for b in ctx.db.baseline_components().iter() {
        if let Some(baseline) = ctx.db.baselines().id().find(b.baseline_id) {
            let mut stat_block = baseline.stat_block;

            if let Some(c) = ctx.db.traits_components().entity_id().find(b.entity_id) {
                for id in c.trait_ids {
                    if let Some(t) = ctx.db.traits().id().find(id) {
                        stat_block.add(t.stat_block);
                    }
                }
            }

            EntityHandle::from_id(ctx, b.entity_id).apply_stat_block(stat_block);
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
    entity_stats_system(ctx);

    Ok(())
}
