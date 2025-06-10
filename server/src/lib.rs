use std::cmp::{max, min};

use action::{ActionContext, ActionEffect, ActionHandle, ActionType};
use appearance::AppearanceFeatureContext;
use component::{
    action_options_components, action_state_components, attack_components, baseline_components,
    entity_deactivation_timer_components, entity_prominence_components, ep_components,
    hp_components, location_components, observer_components, player_controller_components,
    queued_action_state_components, target_components, total_stat_block_dirty_flag_components,
    traits_components, traits_stat_block_cache_components, traits_stat_block_dirty_flag_components,
    MapComponent, MapLayout, ObserverComponent, TimerComponent,
};
use entity::{entities, Entity, EntityHandle};
use event::{early_events, late_events, middle_events, observable_events, EntityEvent, EventType};
use spacetimedb::{reducer, table, ReducerContext, ScheduleAt, Table, TimeDuration};
use stat_block::{baselines, traits, StatBlock, StatBlockBuilder, StatBlockContext};

use crate::{
    component::{Player, RngSeedComponent},
    entity::{ActorArchetype, AllegianceArchetype, MapArchetype, MapGenerator, WithEntityId},
    stat_block::{Baseline, Trait},
};

mod action;
mod appearance;
mod component;
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

    // TODO Realize and unrealize maps base on player locations.
    let map_archetype = MapArchetype {
        entity_id: 0,
        map: MapComponent {
            entity_id: 0,
            loop_count: 0, // TODO Add loops.
            main_room_count: 10,
            map_layout: MapLayout::Path,
            map_theme_id: 0, // TODO Add map_themes table.
            extra_room_count: 10,
        },
        rng_seed: RngSeedComponent {
            entity_id: 0,
            rng_seed: 0,
        },
    }
    .insert(ctx);

    let rooms = map_archetype.generate(ctx).rooms;

    let room1 = &rooms[0]; // WIP Set name to "room1"

    AllegianceArchetype::new().insert(ctx); // WIP Add name allegiance1
    let aa2 = AllegianceArchetype::new().insert(ctx); // WIP allegiance2

    for _ in 0..5 {
        ActorArchetype::new(
            aa2.entity_id,
            room1.entity_id,
            Baseline::name_to_id(ctx, "slime").unwrap_or_default(),
            Trait::name_to_ids(ctx, &[]),
        );
    }

    ctx.db.system_timers().insert(SystemTimer {
        scheduled_id: 0,
        scheduled_at: ScheduleAt::Interval(TimeDuration::from_micros(1000000)),
    });

    Ok(())
}

#[reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) -> Result<(), String> {
    if let Some(p) = Player::find(ctx) {
        if let Some(e) = Entity::find_active(ctx, p.entity_id) {
            TimerComponent::delete_entity_deactivation_timer_component(ctx, e.id);
            log::debug!(
                "Reconnected {} to {} and removed deactivation timer.",
                ctx.sender,
                e.id
            );
        } else if let Some(e) = Entity::find_inactive(ctx, p.entity_id) {
            if let Some(a) = ActorArchetype::inactive_from_entity_id(ctx, e.id) {
                a.activate(ctx);
                log::debug!("Reactivated {} to {}.", ctx.sender, e.id); // WIP
            } else {
                return Err(format!(
                    "Inactive entity {} does not have a corresponding inactive actor archetype.",
                    e.id
                ));
            }
        } else {
            return Err(format!(
                "Found a player {} with no active or inactive entity {}.",
                p.identity, p.entity_id
            ));
        }
    } else {
        let a = Entity::new_player_archetype(ctx)?;
        let p = Player::insert(ctx, a.entity_id);
        log::debug!(
            "Connected new player {} to new actor archetype {}.",
            ctx.sender,
            p.entity_id
        );
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
                        ctx.db
                            .entity_deactivation_timer_components()
                            .insert(TimerComponent {
                                entity_id: e.entity_id,
                                timestamp,
                            });
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
pub fn consume_observer_components(ctx: &ReducerContext) -> Result<(), String> {
    if let Some(p) = ctx
        .db
        .player_controller_components()
        .identity()
        .find(ctx.sender)
    {
        ctx.db.observer_components().entity_id().delete(p.entity_id);
        Ok(())
    } else {
        Err("Cannot consume observer events without a player controller component.".to_string())
    }
}

#[reducer]
pub fn add_trait(ctx: &ReducerContext, entity_id: u64, trait_name: &str) -> Result<(), String> {
    EntityHandle::from_id(ctx, entity_id).add_trait(trait_name);

    Ok(())
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

pub fn observation_system(ctx: &ReducerContext) {
    for o in ctx.db.observable_events().iter() {
        if let Some(l) = ctx
            .db
            .location_components()
            .entity_id()
            .find(o.target_entity_id)
        {
            for l in ctx
                .db
                .location_components()
                .location_entity_id()
                .filter(l.location_entity_id)
            {
                if ctx
                    .db
                    .player_controller_components()
                    .entity_id()
                    .find(l.entity_id)
                    .is_some()
                {
                    ctx.db.observer_components().insert(ObserverComponent {
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
        let e = EntityHandle::from_id(ctx, q.entity_id);
        if e.action_state_component().is_none() {
            let e = e.shift_queued_action_state();
            if let Some(a) = e.action_state_component() {
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
    for mut action_state in ctx.db.action_state_components().iter() {
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
    for f in ctx.db.traits_stat_block_dirty_flag_components().iter() {
        log::debug!("Entity {} is computing traits stat block.", f.entity_id);
        if let Some(c) = ctx.db.traits_components().entity_id().find(f.entity_id) {
            let mut stat_block = StatBlock::default();
            for id in c.trait_ids {
                if let Some(t) = ctx.db.traits().id().find(id) {
                    stat_block.add(t.stat_block);
                }
            }

            EntityHandle::from_id(ctx, f.entity_id)
                .set_traits_stat_block_cache(stat_block)
                .trigger_total_stat_block_dirty_flag();
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

        EntityHandle::from_id(ctx, f.entity_id).apply_stat_block(stat_block);
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
