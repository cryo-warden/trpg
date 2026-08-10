use ecs::WithEcs;
use spacetimedb::{reducer, ReducerContext, ScheduleAt, Table, TimeDuration};

use crate::{
    account::{account_of, AccountId},
    ecs_extension::EcsExtension,
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

/// A player exists per ACCOUNT and is created exactly once, when the account
/// is created — never implicitly at connect. Called from create_account.
pub fn on_account_created(ctx: &ReducerContext, account_id: AccountId) -> Result<(), String> {
    let p = ctx.ecs().new_player(account_id)?;
    log::debug!("Created player {} for account {}.", p.entity_id(), account_id);
    Ok(())
}

#[reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) -> Result<(), String> {
    // An unattached identity may connect (it needs the connection to create an
    // account or request a login) but owns nothing and triggers nothing.
    let Some(account_id) = account_of(ctx, ctx.sender()) else {
        log::debug!("Connected unattached identity {}.", ctx.sender());
        return Ok(());
    };
    let Some(p) = ctx.ecs().from_player_account(account_id) else {
        return Err(format!(
            "Account {} has no player entity; account creation should have made one.",
            account_id
        ));
    };
    p.delete_player_deactivation_timer();
    log::debug!(
        "Reconnected {} (account {}) to {} and removed deactivation timer.",
        ctx.sender(),
        account_id,
        p.entity_id()
    );
    Ok(())
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
