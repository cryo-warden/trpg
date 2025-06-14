use std::cmp::{max, min};

use action::{ActionContext, ActionEffect, ActionHandle, ActionType};
use appearance::AppearanceFeatureContext;
use component::{
    entity_deactivation_timer_components, observer_components,
    total_stat_block_dirty_flag_components, traits_stat_block_dirty_flag_components, MapComponent,
    MapLayout, ObserverComponent, TimerComponent,
};
use entity::Entity;
use event::{early_events, late_events, middle_events, observable_events, EntityEvent, EventType};
use itertools::Itertools;
use spacetimedb::{reducer, table, ReducerContext, ScheduleAt, Table, TimeDuration};
use stat_block::{StatBlock, StatBlockBuilder, StatBlockContext};

use crate::{
    component::{
        ActionStateComponentEntity, AttackComponentEntity, BaselineComponentEntity,
        EpComponentEntity, FlagComponent, HpComponentEntity, Player, RngSeedComponent,
        TraitsComponentEntity,
    },
    entity::{
        actor_archetypes, ActorArchetype, AllegianceArchetype, EntityId, LocationQuery,
        MapArchetype, MapGenerator, Query, StatBlockApplier, WithEntityId,
    },
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
            loop_count: 0, // TODO Add loops.
            main_room_count: 10,
            map_layout: MapLayout::Path,
            map_theme_id: 0, // TODO Add map_themes table.
            extra_room_count: 10,
        },
        rng_seed: RngSeedComponent { rng_seed: 0 },
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
            Trait::names_to_ids(ctx, &[]),
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
    match Player::find(ctx) {
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
pub fn act(ctx: &ReducerContext, action_id: u64, target_entity_id: EntityId) -> Result<(), String> {
    let p = Player::find(ctx).ok_or("Cannot find a player entity.")?;
    let mut a = ActorArchetype::from_entity_id(ctx, p.entity_id)
        .ok_or("Invalid target for the given action.")?;
    a.action_state
        .set_queued_action_state(action_id, target_entity_id);
    Ok(())
}

#[reducer]
pub fn consume_observer_components(ctx: &ReducerContext) -> Result<(), String> {
    if let Some(a) =
        Player::find(ctx).and_then(|p| ActorArchetype::from_entity_id(ctx, p.entity_id))
    {
        log::debug!("Tried to consume observations for actor: {:?}", a);
        Ok(())
    } else {
        Err("Cannot consume observer events without a player controller component.".to_string())
    }
}

#[reducer]
pub fn add_trait(
    ctx: &ReducerContext,
    entity_id: EntityId,
    trait_name: &str,
) -> Result<(), String> {
    let mut a = ActorArchetype::from_entity_id(ctx, entity_id).ok_or("Trait not found.")?;
    a.mut_traits()
        .trait_ids
        .append(&mut Trait::names_to_ids(ctx, &[trait_name]));
    a.update(ctx);
    FlagComponent::insert_traits_stat_block_dirty_flag_component(ctx, entity_id);
    Ok(())
}

#[reducer]
pub fn damage(ctx: &ReducerContext, entity_id: EntityId, damage: i32) -> Result<(), String> {
    let mut a = ActorArchetype::from_entity_id(ctx, entity_id).ok_or("Cannot find entity.")?;
    let hp = a.mut_hp();
    hp.accumulated_damage += damage;
    a.update(ctx);
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
    let lmap = LocationQuery::iter(ctx).into_group_map_by(|a| a.location.location_entity_id);
    for ee in ctx.db.observable_events().iter() {
        if let Some(l) = ActorArchetype::from_entity_id(ctx, ee.target_entity_id) {
            // TODO Move filtering into trait implementation to use SpacetimeDB filter.
            for a in lmap.get(&l.location.location_entity_id).unwrap_or(&vec![]) {
                ctx.db.observer_components().insert(ObserverComponent {
                    entity_id: a.entity_id,
                    observable_event_id: ee.id,
                });
            }
        }
    }
}

pub fn event_resolve_system(ctx: &ReducerContext) {
    for event in ctx.db.early_events().iter() {
        event.resolve(ctx);
        ctx.db.early_events().id().delete(event.id);
    }

    // WIP Split the different event timings and apply other systems in the middle.
    // Apply stat updates between early and middle events.
    // Apply interruptions between middle and late events.

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
    for mut a in ctx.db.actor_archetypes().iter() {
        let hp = a.mut_hp();
        if hp.hp >= 0
            && hp.hp <= hp.mhp
            && hp.accumulated_damage == 0
            && hp.accumulated_healing == 0
        {
            continue;
        }

        hp.hp = max(
            0,
            min(
                hp.mhp,
                hp.hp + hp.accumulated_healing - hp.accumulated_damage,
            ),
        );
        hp.accumulated_healing = 0;
        hp.accumulated_damage = 0;

        a.update(ctx);
    }
}

pub fn ep_system(ctx: &ReducerContext) {
    for mut a in ctx.db.actor_archetypes().iter() {
        let ep = a.mut_ep();
        if ep.ep >= 0 && ep.ep <= ep.mep {
            continue;
        }

        ep.ep = max(0, min(ep.mep, ep.ep));

        a.update(ctx);
    }
}

pub fn shift_queued_action_system(ctx: &ReducerContext) {
    for mut a in ctx.db.actor_archetypes().iter() {
        if a.action_state().action_state.is_none() && a.action_state().queued_action_state.is_some()
        {
            a.mut_action_state().shift_queued_action_state();
            if let Some(ref state) = a.action_state().action_state {
                ctx.db.observable_events().insert(EntityEvent {
                    id: 0,
                    event_type: EventType::StartAction(state.action_id),
                    owner_entity_id: a.entity_id(),
                    target_entity_id: state.target_entity_id,
                    time: ctx.timestamp,
                });
            }
            a.update(ctx);
        }
    }
}

pub fn action_system(ctx: &ReducerContext) {
    for mut a in ctx.db.actor_archetypes().iter() {
        let t = if let Some(t) = a
            .action_state()
            .action_state
            .clone()
            .and_then(|state| ActorArchetype::from_entity_id(ctx, state.target_entity_id))
        {
            t
        } else {
            continue;
        };
        let entity_id = a.entity_id();
        let attack = a.attack().attack;
        let c = a.mut_action_state();
        if let Some(ref action_state) = c.action_state {
            let action_handle = ActionHandle::from_id(ctx, action_state.action_id);

            let effect = action_handle.effect(c.sequence_index);
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
                        let target_defense = t.hp().defense;
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

            c.sequence_index += 1;
            let new_sequence_index = c.sequence_index;

            let effect = action_handle.effect(new_sequence_index);
            if effect.is_none() {
                // TODO Emit event for finished action.
                a.action_state.action_state = None;
            }

            a.update(ctx);
        }
    }
}

pub fn entity_deactivation_system(ctx: &ReducerContext) {
    // WIP Generate a method instead of entity_deactivation_timer_components
    for t in ctx.db.entity_deactivation_timer_components().iter() {
        if t.timestamp.le(&ctx.timestamp) {
            Entity::find_active(ctx, t.entity_id).map(|e| e.deactivate(ctx));
            TimerComponent::delete_entity_deactivation_timer_component(ctx, t.entity_id);
        }
    }
}

pub fn entity_stats_system(ctx: &ReducerContext) {
    for f in ctx.db.traits_stat_block_dirty_flag_components().iter() {
        log::debug!("Entity {} is computing traits stat block.", f.entity_id);
        // WIP Add a method to update the TraitsComponent
        if let Some(mut a) = ActorArchetype::from_entity_id(ctx, f.entity_id) {
            let mut stat_block = StatBlock::default();
            for id in a.traits().trait_ids.iter() {
                if let Some(t) = Trait::find(ctx, *id) {
                    stat_block.add(&t.stat_block);
                }
            }

            a.mut_traits().stat_block_cache = stat_block;
        }
    }

    for f in ctx.db.total_stat_block_dirty_flag_components().iter() {
        log::debug!("Entity {} is computing total stat block.", f.entity_id);
        if let Some(a) = ActorArchetype::from_entity_id(ctx, f.entity_id) {
            let mut stat_block = Baseline::find(ctx, a.baseline().baseline_id)
                .map(|b| b.stat_block)
                .unwrap_or_else(|| StatBlock::default());

            stat_block.add(&a.traits().stat_block_cache);

            a.apply_stat_block(stat_block);
        }
    }
}

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    action_system(ctx);
    event_resolve_system(ctx);
    hp_system(ctx);
    ep_system(ctx);
    shift_queued_action_system(ctx);
    entity_deactivation_system(ctx);
    entity_stats_system(ctx);
    observation_system(ctx);

    Ok(())
}
