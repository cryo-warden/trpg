use std::cmp::{max, min};

use spacetimedb::{Identity, ReducerContext, Table, TimeDuration};

#[spacetimedb::table(name = entities, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[primary_key]
    #[auto_inc]
    id: u64,
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
    fn new(entity_id: u64, mhp: i32) -> HPComponent {
        HPComponent {
            entity_id: entity_id,
            hp: mhp,
            mhp: mhp,
            defense: 0,
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

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {
    ctx.db.system_timers().insert(SystemTimer {
        scheduled_id: 0,
        scheduled_at: spacetimedb::ScheduleAt::Interval(TimeDuration::from_micros(500000)),
    });
    // TEMP
    let e = ctx.db.entities().insert(Entity { id: 0 });
    let hp = ctx.db.hp_components().insert(HPComponent::new(e.id, 10));
    log::debug!("entity {}, hp {}, mhp {}", hp.entity_id, hp.hp, hp.mhp);
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
