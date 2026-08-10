//! Roles attach to ACCOUNTS, never to connection identities: an identity
//! resolves to its account (one unique-index step), and the account's roles
//! gate privileged reducers.
//!
//! The admin bootstrap: the publish action generates a secret token and,
//! immediately after publishing, calls bootstrap_admin with it. That creates
//! the "admin" account with the token as its provisional PASSWORD (only a
//! salted hash is stored, in the private account_passwords table) and flags
//! the account as requiring rotation. The operator claims the account through
//! the ordinary password login (possible only while no identity holds it) and
//! must rotate the password before any privileged action works — rotation
//! overwrites the hash, so the publish-time token ceases to exist the moment
//! the admin claims and rotates. The token is never stored in plaintext
//! anywhere: not in git, not in a table, only in the publish action's
//! environment and the one bootstrap call.

use spacetimedb::{reducer, table, ReducerContext, Table};

use crate::account::{account_of, accounts, insert_account, store_password, AccountId};

pub const ADMIN_ROLE_NAME: &str = "admin";
pub const ADMIN_ACCOUNT_NAME: &str = "admin";

#[table(accessor = roles, public)]
#[derive(Debug, Clone)]
pub struct Role {
    #[primary_key]
    #[auto_inc]
    pub id: u32,
    #[unique]
    pub name: String,
}

#[table(accessor = account_roles, public)]
#[derive(Debug, Clone)]
pub struct AccountRole {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub account_id: AccountId,
    pub role_id: u32,
}

/// Seeded at module init so role ids exist before any client connects.
pub fn seed_roles(ctx: &ReducerContext) {
    ctx.db.roles().insert(Role {
        id: 0,
        name: ADMIN_ROLE_NAME.to_string(),
    });
}

fn role_id(ctx: &ReducerContext, role_name: &str) -> Result<u32, String> {
    ctx.db
        .roles()
        .name()
        .find(role_name.to_string())
        .map(|role| role.id)
        .ok_or_else(|| format!("No role is named \"{}\".", role_name))
}

fn account_has_role(ctx: &ReducerContext, account_id: AccountId, role_id: u32) -> bool {
    ctx.db
        .account_roles()
        .account_id()
        .filter(account_id)
        .any(|ar| ar.role_id == role_id)
}

/// The privileged-action gate: the caller must resolve to an account that
/// holds the admin role AND has no pending password rotation — a provisional
/// credential may claim the account, but never wield it.
pub fn require_admin(ctx: &ReducerContext) -> Result<AccountId, String> {
    let account_id = account_of(ctx, ctx.sender())
        .ok_or_else(|| "This connection is not attached to an account.".to_string())?;
    let admin_role_id = role_id(ctx, ADMIN_ROLE_NAME)?;
    if !account_has_role(ctx, account_id, admin_role_id) {
        return Err("This action requires the admin role.".to_string());
    }
    let account = ctx
        .db
        .accounts()
        .id()
        .find(account_id)
        .ok_or_else(|| format!("Account {} is missing its row.", account_id))?;
    if account.requires_password_rotation {
        return Err(
            "The account's password must be rotated before privileged actions.".to_string(),
        );
    }
    Ok(account_id)
}

/// Admin-gated role assignment (e.g. dev bundles making their claimable
/// playtest account an admin, or a GM promoting another account).
#[reducer]
pub fn grant_role(ctx: &ReducerContext, account_name: String, role_name: String) -> Result<(), String> {
    require_admin(ctx)?;
    let account = ctx
        .db
        .accounts()
        .name()
        .find(account_name.to_owned())
        .ok_or_else(|| format!("No account is named \"{}\".", account_name))?;
    let role_id = role_id(ctx, &role_name)?;
    if account_has_role(ctx, account.id, role_id) {
        return Err(format!(
            "Account \"{}\" already has the \"{}\" role.",
            account_name, role_name
        ));
    }
    ctx.db.account_roles().insert(AccountRole {
        id: 0,
        account_id: account.id,
        role_id,
    });
    Ok(())
}

/// Called by the publish action, once, right after publishing. Creates the
/// admin account with the token as its provisional password and flags it for
/// rotation. Refuses to run twice; between publish and this call there is a
/// first-caller race, accepted for now because publishing and bootstrapping
/// happen back-to-back in one action against a wiped database.
#[reducer]
pub fn bootstrap_admin(ctx: &ReducerContext, admin_token: String) -> Result<(), String> {
    if ctx
        .db
        .accounts()
        .name()
        .find(ADMIN_ACCOUNT_NAME.to_string())
        .is_some()
    {
        return Err("The admin account already exists.".to_string());
    }
    let mut account = insert_account(ctx, ADMIN_ACCOUNT_NAME.to_string())?;
    store_password(ctx, account.id, &admin_token)?;
    account.requires_password_rotation = true;
    ctx.db.accounts().id().update(account.clone());
    ctx.db.account_roles().insert(AccountRole {
        id: 0,
        account_id: account.id,
        role_id: role_id(ctx, ADMIN_ROLE_NAME)?,
    });
    // No player entity: the admin account is an administrative principal, and
    // no assets exist this early anyway. A player for the admin would come
    // from a future explicit flow.
    Ok(())
}
