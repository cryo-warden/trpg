use ecs::WithEcs;
use spacetimedb::{reducer, ReducerContext, ScheduleAt, Table, TimeDuration};

use crate::{
    asset::ReducerContextExtension,
    entity::*,
    reducers::system_timer::{system_timers, SystemTimer},
};

mod act;
mod system;
mod system_timer;

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
    if ctx.get_new_player_blob().is_none() {
        log::debug!("Connected {} before asset initialization.", ctx.sender());
        Ok(())
    } else if let Some(p) = ctx.ecs().from_player_identity(ctx.sender()) {
        p.delete_player_deactivation_timer();
        log::debug!(
            "Reconnected {} to {} and removed deactivation timer.",
            ctx.sender(),
            p.entity_id()
        );
        Ok(())
    } else {
        match ctx.ecs().new_player(ctx.sender()) {
            Ok(p) => {
                log::debug!(
                    "Connected {} to new player {}.",
                    ctx.sender(),
                    p.entity_id()
                );
                Ok(())
            }
            Err(err) => {
                // WIP Check if connected user is admin and DB is not initialized.
                // If admin and DB is not ready, do not emit any error.
                // Otherwise, emit the error.
                log::debug!(
                    "Connected {}, but no player could be found or created. {}",
                    ctx.sender(),
                    err
                );
                Err(err)
            }
        }
    }
}

#[reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    if let Some(e) = ctx.ecs().from_player_identity(ctx.sender()) {
        if e.player_deactivation_timer().is_none() {
            if let Some(timestamp) = ctx
                .timestamp
                .checked_add(TimeDuration::from_micros(30000000))
            {
                e.insert_new_player_deactivation_timer(timestamp);
                log::debug!(
                    "Disconnected {} from player {} and set deactivation timer.",
                    ctx.sender(),
                    e.entity_id()
                );
            }
        }
    } else {
        log::debug!("Disconnected {} but cannot find any player.", ctx.sender());
    }
}
