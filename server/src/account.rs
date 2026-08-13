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
    /// True while the account's password is a provisional secret (e.g. the
    /// publish-time admin token): privileged actions are blocked until the
    /// holder rotates it, which destroys the provisional credential.
    pub requires_password_rotation: bool,
}

/// PRIVATE (server-only): the salted password hash for accounts that have a
/// password. The plaintext is never stored; rotation replaces this row, so
/// a provisional secret ceases to exist the moment it is rotated away.
#[table(accessor = account_passwords)]
#[derive(Debug, Clone)]
pub struct AccountPassword {
    #[primary_key]
    pub account_id: AccountId,
    pub salt: String,
    pub password_hash: String,
    pub updated_at: Timestamp,
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

/// The request's verification code, chosen by the requesting device and shown
/// only on its screen. PRIVATE (server-only) on purpose: voters must get the
/// code out-of-band from the requesting device — a person, not a UI — so an
/// approval proves access to that device's screen, not a blind click.
#[table(accessor = login_request_codes)]
#[derive(Debug, Clone)]
pub struct LoginRequestCode {
    #[primary_key]
    pub login_request_id: u64,
    pub verification_code: String,
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

fn hash_password(salt: &str, password: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(salt.as_bytes());
    hasher.update(password.as_bytes());
    hasher
        .finalize()
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .fold(String::new(), |acc, hex| acc + &hex)
}

fn new_salt(ctx: &ReducerContext) -> String {
    use spacetimedb::rand::Rng;
    let bytes: [u8; 16] = ctx.rng().gen();
    bytes
        .iter()
        .map(|byte| format!("{:02x}", byte))
        .fold(String::new(), |acc, hex| acc + &hex)
}

pub fn store_password(
    ctx: &ReducerContext,
    account_id: AccountId,
    password: &str,
) -> Result<(), String> {
    if password.trim().is_empty() {
        return Err("A password must not be empty.".to_string());
    }
    let salt = new_salt(ctx);
    let row = AccountPassword {
        account_id,
        password_hash: hash_password(&salt, password),
        salt,
        updated_at: ctx.timestamp,
    };
    if ctx
        .db
        .account_passwords()
        .account_id()
        .find(account_id)
        .is_some()
    {
        ctx.db.account_passwords().account_id().update(row);
    } else {
        ctx.db.account_passwords().insert(row);
    }
    Ok(())
}

/// Creates the account ROW only — attachment, players, passwords, and roles
/// are the callers' concerns.
pub fn insert_account(ctx: &ReducerContext, name: String) -> Result<Account, String> {
    if name.trim().is_empty() {
        return Err("An account name must not be empty.".to_string());
    }
    ctx.db
        .accounts()
        .try_insert(Account {
            id: 0,
            name,
            created_at: ctx.timestamp,
            requires_password_rotation: false,
        })
        .map_err(|e| format!("{}", e))
}

// Account creation is ONLY account creation: the player entity is a
// separate concern, provisioned by player_provision_system for any account
// lacking one — a single path shared by every way an account comes to
// exist (created, provisioned, bootstrapped).
#[reducer]
pub fn create_account(ctx: &ReducerContext, name: String) -> Result<(), String> {
    require_unattached(ctx, ctx.sender())?;
    let account = insert_account(ctx, name)?;
    attach_identity(ctx, ctx.sender(), account.id)
}

/// Admin provisioning: creates a CLAIMABLE account — password set, no
/// identity attached — so its first device attaches through the ordinary
/// password login. This is how dev bundles seed playtest accounts and how a
/// GM will hand out accounts; the same no-lurking rule applies the moment
/// the first device claims it. (The player entity arrives separately, from
/// player_provision_system, like every account's.)
#[reducer]
pub fn provision_account(
    ctx: &ReducerContext,
    name: String,
    password: String,
    require_rotation: bool,
) -> Result<(), String> {
    crate::role::require_admin(ctx)?;
    let mut account = insert_account(ctx, name)?;
    store_password(ctx, account.id, &password)?;
    if require_rotation {
        account.requires_password_rotation = true;
        ctx.db.accounts().id().update(account.clone());
    }
    Ok(())
}

/// Password login exists ONLY to bootstrap an account that no device holds
/// yet (e.g. the publish-time admin account). The moment any identity is
/// attached, this path closes: further devices must pass the visible,
/// confirmed login protocol — a password alone can never become a secret
/// lurking connection.
#[reducer]
pub fn login_with_password(
    ctx: &ReducerContext,
    account_name: String,
    password: String,
) -> Result<(), String> {
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
        .account_identities()
        .account_id()
        .filter(account.id)
        .next()
        .is_some()
    {
        return Err(
            "This account already has attached connections; request a confirmed login instead."
                .to_string(),
        );
    }
    let stored = ctx
        .db
        .account_passwords()
        .account_id()
        .find(account.id)
        .ok_or_else(|| "This account has no password.".to_string())?;
    if hash_password(&stored.salt, &password) != stored.password_hash {
        return Err("The password does not match.".to_string());
    }
    attach_identity(ctx, identity, account.id)
}

/// Sets the calling account's password and clears the rotation flag; the
/// previous credential's hash is overwritten and ceases to exist.
#[reducer]
pub fn set_password(ctx: &ReducerContext, new_password: String) -> Result<(), String> {
    let account_id = require_account(ctx, ctx.sender())?;
    store_password(ctx, account_id, &new_password)?;
    let mut account = ctx
        .db
        .accounts()
        .id()
        .find(account_id)
        .ok_or_else(|| format!("Account {} is missing its row.", account_id))?;
    account.requires_password_rotation = false;
    ctx.db.accounts().id().update(account);
    Ok(())
}

#[reducer]
pub fn request_login(
    ctx: &ReducerContext,
    account_name: String,
    verification_code: String,
) -> Result<(), String> {
    let identity = ctx.sender();
    require_unattached(ctx, identity)?;
    if verification_code.trim().is_empty() {
        return Err("A login request requires a verification code.".to_string());
    }
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
    ctx.db.login_request_codes().insert(LoginRequestCode {
        login_request_id: request.id,
        verification_code,
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

/// The shared entry checks for a voter responding to a pending request:
/// the request must be pending, the caller must be in the voter snapshot,
/// and must not have responded yet. Returns the request, the voter count,
/// and the prior responses.
fn open_response(
    ctx: &ReducerContext,
    login_request_id: u64,
) -> Result<(LoginRequest, usize, Vec<LoginResponse>), String> {
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
    Ok((request, voters.len(), responses))
}

#[reducer]
pub fn accept_login_request(
    ctx: &ReducerContext,
    login_request_id: u64,
    verification_code: String,
) -> Result<(), String> {
    let (request, voter_count, responses) = open_response(ctx, login_request_id)?;
    // An approval only counts with the matching code, which is shown only on
    // the requesting device's screen: matching proves the approver actually
    // coordinated with that device.
    let code = ctx
        .db
        .login_request_codes()
        .login_request_id()
        .find(login_request_id)
        .ok_or_else(|| format!("Login request {} has no verification code.", login_request_id))?;
    if code.verification_code != verification_code {
        return Err("The verification code does not match the login request.".to_string());
    }
    ctx.db.login_responses().insert(LoginResponse {
        id: 0,
        login_request_id,
        identity: ctx.sender(),
        accepted: true,
        responded_at: ctx.timestamp,
    });

    let accepted_count = responses.iter().filter(|r| r.accepted).count() + 1;
    let responded_count = responses.len() + 1;
    let quorum_reached = accepted_count * 2 >= voter_count;
    if responded_count == voter_count {
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

/// Refusal deliberately needs NO verification code: rejecting an intruder
/// must always be the easy path, and any explicit refusal fails the request
/// immediately.
#[reducer]
pub fn refuse_login_request(ctx: &ReducerContext, login_request_id: u64) -> Result<(), String> {
    let (request, _, _) = open_response(ctx, login_request_id)?;
    ctx.db.login_responses().insert(LoginResponse {
        id: 0,
        login_request_id,
        identity: ctx.sender(),
        accepted: false,
        responded_at: ctx.timestamp,
    });
    refuse_login(ctx, request);
    Ok(())
}

#[reducer]
pub fn finalize_login(ctx: &ReducerContext, timer: LoginFinalizeTimer) -> Result<(), String> {
    if ctx.sender() != ctx.database_identity() {
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
