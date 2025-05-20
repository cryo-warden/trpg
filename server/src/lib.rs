use std::cmp::{max, min};

use action::ActionBuilder;
use entity::hp_components;
use spacetimedb::{ReducerContext, Table, TimeDuration};

mod action;

mod entity;

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    ctx.db.system_timers().insert(SystemTimer {
        scheduled_id: 0,
        scheduled_at: spacetimedb::ScheduleAt::Interval(TimeDuration::from_micros(500000)),
    });

    entity::EntityBuilder::new(ctx).add_hp(10);

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

#[spacetimedb::reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    hp_system(ctx);

    Ok(())
}
