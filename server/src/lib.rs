use crate::action::ActionId;
use ecs::WithEcs;
use entity::*;
use spacetimedb::{reducer, table, ReducerContext, ScheduleAt, Table, TimeDuration};

mod action;
mod admin;
mod appearance;
mod entity;
mod event;
mod stat_block;
mod system;

#[reducer(init)]
pub fn init(ctx: &ReducerContext) -> Result<(), String> {
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
                ctx.sender(),
                e.entity_id()
            );
        }
        None => match ctx.ecs().find_player(ctx.sender()) {
            Some(p) => {
                // WIP
                // let e = p.activate();
                // log::debug!("Reactivated {} to {}.", ctx.sender(), e.entity_id());
            }
            None => {
                match ctx.ecs().new_player() {
                    Ok(p) => {
                        log::debug!(
                            "Connected {} to new player {}.",
                            ctx.sender(),
                            p.entity_id()
                        );
                    }
                    _ => {
                        // WIP Check if connected user is admin and DB is not initialized.
                        // If admin and DB is not ready, do not emit any error.
                        // Otherwise, emit the error.
                        log::debug!(
                            "Connected {}, but no player could be created.",
                            ctx.sender()
                        );
                    }
                }
            }
        },
    }

    Ok(())
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    match ctx.ecs().from_player_identity() {
        None => {
            log::debug!("Disconnected {} but cannot find any player.", ctx.sender());
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
                            ctx.sender(),
                            e.entity_id()
                        );
                    }
                }
            }
        }
    }
}

#[reducer]
pub fn act(ctx: &ReducerContext, action_id: ActionId, target_entity_id: u64) -> Result<(), String> {
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

#[table(accessor = system_timers, scheduled(run_system))]
pub struct SystemTimer {
    #[primary_key]
    #[auto_inc]
    scheduled_id: u64,
    scheduled_at: spacetimedb::ScheduleAt,
}

#[reducer]
pub fn run_system(ctx: &ReducerContext, _timer: SystemTimer) -> Result<(), String> {
    use system::*;

    let ecs = ctx.ecs();

    observation_reset_system(ecs);
    action_system(ecs);
    hp_system(ecs);
    ep_system(ecs);
    shift_queued_action_system(ecs);
    entity_prominence_system(ecs);
    entity_deactivation_system(ecs);
    entity_stats_system(ecs);

    Ok(())
}
