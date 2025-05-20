use std::cmp::{max, min};

use action::ActionBuilder;
use spacetimedb::{Identity, ReducerContext, Table, TimeDuration};

mod action;

#[spacetimedb::table(name = entities, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[primary_key]
    #[auto_inc]
    id: u64,
}

pub struct EntityBuilder<'a> {
    ctx: &'a ReducerContext,
    entity_id: u64,
}

impl<'a> EntityBuilder<'a> {
    pub fn new(ctx: &'a ReducerContext) -> Self {
        let entity = ctx.db.entities().insert(Entity { id: 0 });
        Self {
            ctx,
            entity_id: entity.id,
        }
    }

    pub fn from_id(ctx: &'a ReducerContext, entity_id: u64) -> Self {
        Self { ctx, entity_id }
    }

    pub fn add_hp(self, hp: i32) -> Self {
        self.ctx
            .db
            .hp_components()
            .insert(HPComponent::new(self.entity_id, hp));
        self
    }
}

#[spacetimedb::table(name = hp_components, public)]
#[derive(Debug, Clone)]
pub struct HPComponent {
    #[primary_key]
    entity_id: u64,
    hp: i32,
    mhp: i32,
    defense: i32,
    accumulated_damage: i32,
    accumulated_healing: i32,
}

impl HPComponent {
    pub fn new(entity_id: u64, mhp: i32) -> Self {
        Self {
            entity_id: entity_id,
            hp: mhp,
            mhp,
            defense: 0,
            accumulated_damage: 0,
            accumulated_healing: 0,
        }
    }

    pub fn new_with_defense(entity_id: u64, mhp: i32, defense: i32) -> Self {
        Self {
            entity_id: entity_id,
            hp: mhp,
            mhp,
            defense,
            accumulated_damage: 0,
            accumulated_healing: 0,
        }
    }
}

#[spacetimedb::table(name = player_controller_components, public)]
#[derive(Debug, Clone)]
pub struct PlayerControllerComponent {
    #[primary_key]
    entity_id: u64,
    #[unique]
    identity: Identity,
}

#[spacetimedb::table(name = action_state_components, public)]
#[derive(Debug, Clone)]
pub struct ActionStateComponent {
    #[primary_key]
    entity_id: u64,
    action_id: u64,
    sequence_index: i32,
}

#[spacetimedb::table(name = entity_targets, public)]
#[derive(Debug, Clone)]
pub struct EntityTarget {
    #[primary_key]
    entity_id: u64,
    target_entity_id: u64,
}

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    ctx.db.system_timers().insert(SystemTimer {
        scheduled_id: 0,
        scheduled_at: spacetimedb::ScheduleAt::Interval(TimeDuration::from_micros(500000)),
    });

    EntityBuilder::new(ctx).add_hp(10);

    action::ActionBuilder::new(ctx)
        .set_name("bop")
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest();

    action::ActionBuilder::new(ctx)
        .set_name("boppity_bop")
        .add_rest()
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_attack(1)
        .add_rest()
        .add_rest();

    let ab = ActionBuilder::from_id(ctx, 1);
    let mut i = 0;
    let mut oe = ab.effect(i);
    while let Some(e) = oe {
        log::debug!("action {} effect {} is {:?}", 1, i, e);
        i += 1;
        oe = ab.effect(i);
    }

    let ab = ActionBuilder::from_id(ctx, 2);
    let mut i = 0;
    let mut oe = ab.effect(i);
    while let Some(e) = oe {
        log::debug!("action {} effect {} is {:?}", 2, i, e);
        i += 1;
        oe = ab.effect(i);
    }
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(_ctx: &ReducerContext) {}

#[spacetimedb::reducer]
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

#[spacetimedb::table(name = system_timers, scheduled(run_system))]
pub struct SystemTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: spacetimedb::ScheduleAt,
}

#[spacetimedb::reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
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
        // ctx.db.hp_components().entity_id().update(hp);
        let hp = ctx.db.hp_components().entity_id().update(hp);
        log::debug!(
            "updated entity {}, hp {}, mhp {}",
            hp.entity_id,
            hp.hp,
            hp.mhp
        );
    }

    Ok(())
}
