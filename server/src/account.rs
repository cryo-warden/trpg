//! The accounts layer: durable principals between connection identities and
//! everything trustworthy (roles, player ownership).
//!
//! A SpacetimeDB Identity corresponds to a specific client connection/device,
//! so nothing durable attaches to identities directly. An account owns one or
//! more identities through account_identities, and attaching a NEW identity
//! is gated by the confirmed multi-device login protocol:
//!
//! - Only previous connections have any basis for trust; the requesting
//!   connection has none until they share theirs.
//! - The voter set is snapshotted at request time (login_request_voters).
//! - At least half of the voters must accept; ANY explicit refusal fails the
//!   request immediately.
//! - Acceptance is delayed until every voter has responded, or 30 seconds
//!   after the acceptance quorum was reached, whichever comes first — the
//!   delay exists so laggard devices can still refuse.
//!
//! login_requests and login_responses are SECURITY RECORDS: persistent,
//! regular tables that are never pruned (deliberately not modeled as an
//! ephemeral events table). All tables here are public so every device can
//! see the machinery working — a login request is visible by construction and
//! can never be a secret lurking connection.

use spacetimedb::{
    reducer, table, Identity, ReducerContext, ScheduleAt, SpacetimeType, Table, TimeDuration,
    Timestamp,
};

pub type AccountId = u64;

const LOGIN_QUORUM_DELAY_MICROS: i64 = 30_000_000;

#[table(accessor = accounts, public)]
#[derive(Debug, Clone)]
pub struct Account {
    #[primary_key]
    #[auto_inc]
    pub id: AccountId,
    #[unique]
    pub name: String,
    pub created_at: Timestamp,
}

/// One identity belongs to at most one account, forever (detachment would be
/// its own explicit, confirmed operation).
#[table(accessor = account_identities, public)]
#[derive(Debug, Clone)]
pub struct AccountIdentity {
    #[primary_key]
    pub identity: Identity,
    #[index(btree)]
    pub account_id: AccountId,
    pub attached_at: Timestamp,
}

#[derive(Debug, Clone, PartialEq, Eq, SpacetimeType)]
pub enum LoginRequestStatus {
    Pending,
    Accepted,
    Refused,
}

/// SECURITY RECORD: one row per attachment attempt, kept forever.
#[table(accessor = login_requests, public)]
#[derive(Debug, Clone)]
pub struct LoginRequest {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub account_id: AccountId,
    /// The requesting (untrusted, unattached) identity.
    pub identity: Identity,
    pub requested_at: Timestamp,
    pub status: LoginRequestStatus,
    pub quorum_reached_at: Option<Timestamp>,
    pub resolved_at: Option<Timestamp>,
}

/// The voter set snapshotted when the request was created: exactly the
/// identities that were attached at that moment.
#[table(accessor = login_request_voters, public)]
#[derive(Debug, Clone)]
pub struct LoginRequestVoter {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub login_request_id: u64,
    pub identity: Identity,
}

/// SECURITY RECORD: one row per voter response, kept forever.
#[table(accessor = login_responses, public)]
#[derive(Debug, Clone)]
pub struct LoginResponse {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub login_request_id: u64,
    pub identity: Identity,
    pub accepted: bool,
    pub responded_at: Timestamp,
}

/// Schedules the post-quorum finalization delay.
#[table(accessor = login_finalize_timers, scheduled(finalize_login))]
pub struct LoginFinalizeTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: ScheduleAt,
    pub login_request_id: u64,
}

pub fn account_of(ctx: &ReducerContext, identity: Identity) -> Option<AccountId> {
    ctx.db
        .account_identities()
        .identity()
        .find(identity)
        .map(|ai| ai.account_id)
}

pub fn require_account(ctx: &ReducerContext, identity: Identity) -> Result<AccountId, String> {
    account_of(ctx, identity)
        .ok_or_else(|| "This connection is not attached to an account.".to_string())
}

fn require_unattached(ctx: &ReducerContext, identity: Identity) -> Result<(), String> {
    if account_of(ctx, identity).is_some() {
        return Err("This connection is already attached to an account.".to_string());
    }
    Ok(())
}

fn attach_identity(ctx: &ReducerContext, identity: Identity, account_id: AccountId) -> Result<(), String> {
    ctx.db
        .account_identities()
        .try_insert(AccountIdentity {
            identity,
            account_id,
            attached_at: ctx.timestamp,
        })
        .map(|_| ())
        .map_err(|e| format!("{}", e))
}

#[reducer]
pub fn create_account(ctx: &ReducerContext, name: String) -> Result<(), String> {
    require_unattached(ctx, ctx.sender())?;
    if name.trim().is_empty() {
        return Err("An account name must not be empty.".to_string());
    }
    let account = ctx
        .db
        .accounts()
        .try_insert(Account {
            id: 0,
            name,
            created_at: ctx.timestamp,
        })
        .map_err(|e| format!("{}", e))?;
    attach_identity(ctx, ctx.sender(), account.id)?;
    crate::reducers::on_account_created(ctx, account.id)
}

#[reducer]
pub fn request_login(ctx: &ReducerContext, account_name: String) -> Result<(), String> {
    let identity = ctx.sender();
    require_unattached(ctx, identity)?;
    let account = ctx
        .db
        .accounts()
        .name()
        .find(account_name.to_owned())
        .ok_or_else(|| format!("No account is named \"{}\".", account_name))?;
    if ctx
        .db
        .login_requests()
        .iter()
        .any(|r| r.identity == identity && r.status == LoginRequestStatus::Pending)
    {
        return Err("This connection already has a pending login request.".to_string());
    }
    let request = ctx.db.login_requests().insert(LoginRequest {
        id: 0,
        account_id: account.id,
        identity,
        requested_at: ctx.timestamp,
        status: LoginRequestStatus::Pending,
        quorum_reached_at: None,
        resolved_at: None,
    });
    for attached in ctx.db.account_identities().account_id().filter(account.id) {
        ctx.db.login_request_voters().insert(LoginRequestVoter {
            id: 0,
            login_request_id: request.id,
            identity: attached.identity,
        });
    }
    Ok(())
}

fn accept_login(ctx: &ReducerContext, mut request: LoginRequest) -> Result<(), String> {
    attach_identity(ctx, request.identity, request.account_id)?;
    request.status = LoginRequestStatus::Accepted;
    request.resolved_at = Some(ctx.timestamp);
    ctx.db.login_requests().id().update(request);
    Ok(())
}

fn refuse_login(ctx: &ReducerContext, mut request: LoginRequest) {
    request.status = LoginRequestStatus::Refused;
    request.resolved_at = Some(ctx.timestamp);
    let stale_timers: Vec<u64> = ctx
        .db
        .login_finalize_timers()
        .iter()
        .filter(|t| t.login_request_id == request.id)
        .map(|t| t.scheduled_id)
        .collect();
    for scheduled_id in stale_timers {
        ctx.db
            .login_finalize_timers()
            .scheduled_id()
            .delete(scheduled_id);
    }
    ctx.db.login_requests().id().update(request);
}

#[reducer]
pub fn respond_login(
    ctx: &ReducerContext,
    login_request_id: u64,
    accept: bool,
) -> Result<(), String> {
    let identity = ctx.sender();
    let request = ctx
        .db
        .login_requests()
        .id()
        .find(login_request_id)
        .ok_or_else(|| format!("No login request {} exists.", login_request_id))?;
    if request.status != LoginRequestStatus::Pending {
        return Err(format!(
            "Login request {} is already resolved.",
            login_request_id
        ));
    }
    let voters: Vec<LoginRequestVoter> = ctx
        .db
        .login_request_voters()
        .login_request_id()
        .filter(login_request_id)
        .collect();
    if !voters.iter().any(|v| v.identity == identity) {
        return Err("Only the account's previously attached connections may respond.".to_string());
    }
    let responses: Vec<LoginResponse> = ctx
        .db
        .login_responses()
        .login_request_id()
        .filter(login_request_id)
        .collect();
    if responses.iter().any(|r| r.identity == identity) {
        return Err("This connection has already responded to that login request.".to_string());
    }
    ctx.db.login_responses().insert(LoginResponse {
        id: 0,
        login_request_id,
        identity,
        accepted: accept,
        responded_at: ctx.timestamp,
    });

    // Any explicit refusal fails the request immediately.
    if !accept {
        refuse_login(ctx, request);
        return Ok(());
    }

    let accepted_count = responses.iter().filter(|r| r.accepted).count() + 1;
    let responded_count = responses.len() + 1;
    let quorum_reached = accepted_count * 2 >= voters.len();
    if responded_count == voters.len() {
        // Every previous connection has responded, none refused: accept now.
        if quorum_reached {
            return accept_login(ctx, request);
        }
        // All responded but fewer than half accepted — nobody refused
        // outright, but the trust bar was not met.
        refuse_login(ctx, request);
        return Ok(());
    }
    if quorum_reached && request.quorum_reached_at.is_none() {
        // Quorum just reached: start the 30-second window in which the
        // remaining connections can still refuse.
        let mut request = request;
        request.quorum_reached_at = Some(ctx.timestamp);
        ctx.db.login_requests().id().update(request);
        let finalize_at = ctx
            .timestamp
            .checked_add(TimeDuration::from_micros(LOGIN_QUORUM_DELAY_MICROS))
            .ok_or_else(|| "Failed to compute the login finalization time.".to_string())?;
        ctx.db.login_finalize_timers().insert(LoginFinalizeTimer {
            scheduled_id: 0,
            scheduled_at: ScheduleAt::Time(finalize_at),
            login_request_id,
        });
    }
    Ok(())
}

#[reducer]
pub fn finalize_login(ctx: &ReducerContext, timer: LoginFinalizeTimer) -> Result<(), String> {
    if ctx.sender() != ctx.identity() {
        return Err("finalize_login may only run on schedule.".to_string());
    }
    let request = ctx
        .db
        .login_requests()
        .id()
        .find(timer.login_request_id)
        .ok_or_else(|| {
            format!(
                "No login request {} exists for finalization.",
                timer.login_request_id
            )
        })?;
    if request.status != LoginRequestStatus::Pending {
        // Resolved before the delay elapsed (all voters responded, or a
        // refusal landed): the timer has nothing left to do.
        return Ok(());
    }
    // A pending request with a scheduled finalization reached quorum and saw
    // no refusal during the window.
    accept_login(ctx, request)
}
