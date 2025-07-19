use action::{ActionContext, ActionType};
use appearance::AppearanceFeatureContext;
use ecs::WithEcs;
use entity::*;
use spacetimedb::{reducer, table, ReducerContext, ScheduleAt, Table, TimeDuration};
use stat_block::{StatBlockBuilder, StatBlockContext};
use system::*;

mod action;
mod appearance;
mod entity;
mod event;
mod stat_block;
mod system;

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
    match ctx.ecs().from_player_identity() {
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
                let e = ctx.ecs().new_player()?;
                log::debug!("Connected {} to new player {}.", ctx.sender, e.entity_id());
            }
        },
    }

    Ok(())
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    match ctx.ecs().from_player_identity() {
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
    match ctx.ecs().from_player_identity() {
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
    match ctx.ecs().from_player_identity() {
        Some(p) => {
            p.into_handle().set_target(target_entity_id);
            // TODO Only update for the given player and target.
            action_option_system(ctx.ecs());
            Ok(())
        }
        None => Err("Cannot find a player entity.".to_string()),
    }
}

#[reducer]
pub fn delete_target(ctx: &ReducerContext) -> Result<(), String> {
    match ctx.ecs().from_player_identity() {
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

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    let ecs = ctx.ecs();
    action_system(ecs);
    event_resolve_system(ecs);
    hp_system(ecs);
    ep_system(ecs);
    shift_queued_action_system(ecs);
    target_validation_system(ecs);
    action_option_system(ecs);
    entity_prominence_system(ecs);
    entity_deactivation_system(ecs);
    entity_stats_system(ecs);
    observation_system(ecs);

    Ok(())
}
