use std::cmp::{max, min};

use action::{ActionContext, ActionEffect, ActionHandle, ActionType};
use appearance::AppearanceFeatureContext;
use ecs::WithEcs;
use entity::*;
use event::{early_events, late_events, middle_events, observable_events, EntityEvent, EventType};
use spacetimedb::{reducer, table, ReducerContext, ScheduleAt, Table, TimeDuration};
use stat_block::{baselines, traits, StatBlock, StatBlockBuilder, StatBlockContext};

mod action;
mod appearance;
mod entity;
mod event;
mod stat_block;

#[reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
    let af_ctx = AppearanceFeatureContext::new(ctx)
        .insert_noun("path", 10000)
        .insert_noun("room", 10000)
        .insert_noun("human", -100)
        .insert_noun("slime", 100)
        .insert_adjective("tiny", 1000)
        .insert_adjective("small", 900)
        .insert_adjective("big", 900)
        .insert_adjective("huge", 1000);

    let a_ctx = ActionContext::new(ctx);

    a_ctx
        .new_handle("quick_move", ActionType::Move)
        .add_appearance(
            "Quick Move",
            "{0:sentence:subject} moved quickly toward {1:object}.",
        )
        .add_move();
    a_ctx
        .new_handle("divine_heal", ActionType::Buff)
        .add_appearance(
            "Divine Heal",
            "{0:sentence:subject} began to focus a beam of pure lifeforce onto {1:object}.",
        )
        .add_heal(500);
    a_ctx
        .new_handle("move", ActionType::Move)
        .add_appearance("Move", "{0:sentence:subject} moved toward {1:object}.")
        .add_rest()
        .add_rest()
        .add_move()
        .add_rest();
    a_ctx
        .new_handle("bop", ActionType::Attack)
        .add_appearance("Bop", "{0:sentence:subject} wound up to bop {1:object}.")
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest();
    a_ctx
        .new_handle("boppity_bop", ActionType::Attack)
        .add_appearance(
            "Boppity Bop",
            "{0:sentence:subject} wound up to boppity-bop {1:object}.",
        )
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_rest();

    StatBlockContext::new(ctx)
        .insert_baseline(
            "human",
            &StatBlockBuilder::default()
                .appearance_feature_ids(af_ctx.by_texts(&["human"]))
                .mhp(5)
                .mep(5),
        )
        .insert_baseline(
            "slime",
            &StatBlockBuilder::default()
                .appearance_feature_ids(af_ctx.by_texts(&["slime"]))
                .attack(-1)
                .defense(-1)
                .mhp(3)
                .mep(2),
        )
        .insert_trait(
            "admin",
            &StatBlockBuilder::default()
                .additive_action_ids(a_ctx.by_names(&["quick_move", "divine_heal"])),
        )
        .insert_trait(
            "mobile",
            &StatBlockBuilder::default().additive_action_ids(a_ctx.by_names(&["move"])),
        )
        .insert_trait(
            "bopper",
            &StatBlockBuilder::default()
                .additive_action_ids(a_ctx.by_names(&["bop", "boppity_bop"])),
        )
        .insert_trait(
            "tiny",
            &StatBlockBuilder::default()
                .appearance_feature_ids(af_ctx.by_texts(&["tiny"]))
                .attack(-1)
                .mhp(-2),
        )
        .insert_trait(
            "small",
            StatBlockBuilder::default()
                .appearance_feature_ids(af_ctx.by_texts(&["small"]))
                .mhp(-1),
        )
        .insert_trait(
            "big",
            StatBlockBuilder::default()
                .appearance_feature_ids(af_ctx.by_texts(&["big"]))
                .mhp(2),
        )
        .insert_trait(
            "huge",
            StatBlockBuilder::default()
                .appearance_feature_ids(af_ctx.by_texts(&["huge"]))
                .attack(1)
                .mhp(5),
        );

    // TODO Realize and unrealize maps.
    let map = ctx
        .ecs()
        .new()
        .upsert_new_rng_seed(0)
        // TODO Add map_themes table.
        .upsert_new_unrealized_map(0, MapLayout::Path, 0, 10, 10);
    let map_result = map.generate(ctx);

    ctx.ecs().new().set_name("allegiance1");
    let allegiance2 = ctx.ecs().new().set_name("allegiance2");
    let room = ctx.ecs().find(map_result.room_ids[0]).set_name("room1");
    for _ in 0..5 {
        ctx.ecs()
            .new()
            .set_allegiance(allegiance2.entity_id())
            .set_baseline("slime")
            .upsert_new_location(room.entity_id());
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
            e.delete_entity_deactivation_timer();
            log::debug!(
                "Reconnected {} to {} and removed deactivation timer.",
                ctx.sender,
                e.entity_id()
            );
        }
        None => match InactiveEntityHandle::from_player_identity(ctx) {
            Some(h) => {
                let e = h.activate();
                log::debug!("Reactivated {} to {}.", ctx.sender, e.entity_id());
            }
            None => {
                let e = Entity::new_player(ctx)?;
                log::debug!("Connected {} to new player {}.", ctx.sender, e.entity_id());
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
            if e.entity_deactivation_timer().is_none() {
                match ctx
                    .timestamp
                    .checked_add(TimeDuration::from_micros(30000000))
                {
                    None => {}
                    Some(timestamp) => {
                        e.insert_new_entity_deactivation_timer(timestamp);
                        log::debug!(
                            "Disconnected {} from player {} and set deactivation timer.",
                            ctx.sender,
                            e.entity_id()
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
            if p.to_handle().can_target_other(target_entity_id, action_id) {
                p.into_handle()
                    .set_queued_action_state(action_id, target_entity_id);
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
            p.into_handle().set_target(target_entity_id);
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
            p.into_handle().delete_target();
            Ok(())
        }
        None => Err("Cannot find a player entity.".to_string()),
    }
}

#[reducer]
pub fn consume_observer_components(ctx: &ReducerContext) -> Result<(), String> {
    if let Some(p) = ctx
        .db
        .player_controller_components()
        .identity()
        .find(ctx.sender)
    {
        ctx.db.entity_observations().entity_id().delete(p.entity_id);
        Ok(())
    } else {
        Err("Cannot consume observer events without a player controller component.".to_string())
    }
}

#[reducer]
pub fn add_trait(ctx: &ReducerContext, entity_id: u64, trait_name: &str) -> Result<(), String> {
    ctx.ecs().find(entity_id).add_trait(trait_name);

    Ok(())
}

#[reducer]
pub fn damage(ctx: &ReducerContext, entity_id: u64, damage: i32) -> Result<(), String> {
    let mut hp = ctx
        .ecs()
        .find(entity_id)
        .hp()
        .ok_or("Cannot find entity with hp.")?;
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

pub fn observation_system(ctx: &ReducerContext) {
    for o in ctx.db.observable_events().iter() {
        if let Some(l) = ctx.ecs().find(o.target_entity_id).with_location() {
            for l in ctx
                .db
                .location_components()
                .location_entity_id()
                .filter(l.location().location_entity_id)
            {
                if ctx.ecs().find(l.entity_id).player_controller().is_some() {
                    ctx.db.entity_observations().insert(EntityObservations {
                        entity_id: l.entity_id,
                        observable_event_id: o.id,
                    });
                }
            }
        }
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
        let e = ctx.ecs().find(q.entity_id);
        if e.action_state().is_none() {
            let e = e.shift_queued_action_state();
            if let Some(a) = e.action_state() {
                ctx.db.observable_events().insert(EntityEvent {
                    id: 0,
                    event_type: EventType::StartAction(a.action_id),
                    owner_entity_id: a.entity_id,
                    target_entity_id: a.target_entity_id,
                    time: ctx.timestamp,
                });
            }
        }
    }
}

pub fn action_system(ctx: &ReducerContext) {
    for mut e in ActionStateComponent::iter_action_state(ctx) {
        let action_state = e.action_state();
        let entity_id = action_state.entity_id;
        let action_handle = ActionHandle::from_id(ctx, action_state.action_id);

        let effect = action_handle.effect(action_state.sequence_index);
        if let Some(ref effect) = effect {
            match effect {
                ActionEffect::Buff(_) => {
                    EntityEvent::emit_early(
                        ctx,
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    );
                }
                ActionEffect::Attack(damage) => {
                    let attack = e.attack().map(|c| c.attack).unwrap_or(0);
                    let t = ctx.ecs().find(action_state.target_entity_id);
                    let target_defense = t.hp().map(|c| c.defense).unwrap_or(0);
                    EntityEvent::emit_middle(
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
                    EntityEvent::emit_middle(
                        ctx,
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    );
                }
                _ => {
                    EntityEvent::emit_late(
                        ctx,
                        entity_id,
                        EventType::ActionEffect(effect.to_owned()),
                        action_state.target_entity_id,
                    );
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
}

pub fn target_validation_system(ctx: &ReducerContext) {
    for e in TargetComponent::iter_target(ctx) {
        let t = ctx.ecs().find(e.target().target_entity_id);
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

pub fn action_option_system(_ctx: &ReducerContext) {
    // for action_option_component in ctx.db.action_options_components().iter() {
    //     ctx.db
    //         .action_options_components()
    //         .delete(action_option_component);
    // }
    // for e in LocationComponent::iter_location(ctx) {
    //     for other_entity_id in match e.target() {
    //         None => vec![e.location().entity_id], // WIP entity_id()
    //         Some(target) => {
    //             if e.location().entity_id == target.target_entity_id {
    //                 vec![e.location().entity_id]
    //             } else {
    //                 vec![e.location().entity_id, target.target_entity_id]
    //             }
    //         }
    //     } {
    //         for _action_id in e.actions().iter().flat_map(|a| &a.action_ids) {
    //             // WIP Take methods out of EntityHandle and onto component traits.
    //             // if e.can_target_other(other_entity_id, action_id) {
    //             //     e = e.add_action_option(action_id, other_entity_id);
    //             // }
    //         }
    //     }
    // }
}

pub fn entity_prominence_system(ctx: &ReducerContext) {
    for p in EntityProminenceComponent::iter_entity_prominence(ctx) {
        p.delete_entity_prominence();
    }
    for entity in ctx.db.entities().iter() {
        ctx.ecs().find(entity.id).generate_prominence();
    }
}

pub fn entity_deactivation_system(ctx: &ReducerContext) {
    for t in TimerComponent::iter_entity_deactivation_timer(ctx) {
        if t.entity_deactivation_timer().timestamp.le(&ctx.timestamp) {
            let entity_id = t.entity_id();
            t.delete_entity_deactivation_timer();
            let handle = ctx.ecs().find(entity_id);
            let _ = handle.new_blob();
            // WIP Complete deactivation by moving blob into a new entity_blobs table.
            handle.delete();
        }
    }
}

pub fn entity_stats_system(ctx: &ReducerContext) {
    for f in ctx.db.traits_stat_block_dirty_flag_components().iter() {
        log::debug!("Entity {} is computing traits stat block.", f.entity_id);
        if let Some(c) = ctx.db.traits_components().entity_id().find(f.entity_id) {
            let mut stat_block = StatBlock::default();
            for id in c.trait_ids {
                if let Some(t) = ctx.db.traits().id().find(id) {
                    stat_block.add(t.stat_block);
                }
            }

            ctx.ecs()
                .find(f.entity_id)
                .set_traits_stat_block_cache(stat_block)
                .upsert_new_total_stat_block_dirty_flag();
        }
    }

    for f in ctx.db.total_stat_block_dirty_flag_components().iter() {
        log::debug!("Entity {} is computing total stat block.", f.entity_id);
        let mut stat_block = ctx
            .db
            .baseline_components()
            .entity_id()
            .find(f.entity_id)
            .and_then(|b| ctx.db.baselines().id().find(b.baseline_id))
            .map(|b| b.stat_block)
            .unwrap_or_else(|| StatBlock::default());

        if let Some(t) = ctx
            .db
            .traits_stat_block_cache_components()
            .entity_id()
            .find(f.entity_id)
        {
            stat_block.add(t.stat_block);
        }

        ctx.ecs().find(f.entity_id).apply_stat_block(stat_block);
    }
}

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
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
    observation_system(ctx);

    Ok(())
}
