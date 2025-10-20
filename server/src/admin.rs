use crate::action::{action_steps, actions, Action, ActionStep};
use crate::entity::*;
use crate::stat_block::{baselines, traits, Baseline, Trait};
use ecs::WithEcs;
use spacetimedb::sys::Result;
use spacetimedb::{reducer, table, Identity, ReducerContext, SpacetimeType, Table};

#[derive(Debug, Clone, SpacetimeType)]
pub struct AdminBundle {
    pub actions: Vec<Action>,
    pub action_steps: Vec<ActionStep>,
    pub baselines: Vec<Baseline>,
    pub traits: Vec<Trait>,
    pub special_entity_blobs: Vec<SpecialEntityBlob>,
}

#[table(name = admin_identities)]
#[derive(Debug, Clone)]
pub struct AdminIdentity {
    #[unique]
    pub identity: Identity,
}

fn is_admin(ctx: &ReducerContext) -> bool {
    ctx.db
        .admin_identities()
        .identity()
        .find(ctx.sender)
        .is_some()
}

fn require_admin(ctx: &ReducerContext) -> Result<(), String> {
    if is_admin(ctx) {
        Ok(())
    } else {
        Err("Only admins can perform this action.".to_string())
    }
}

#[reducer]
pub fn register_admin(ctx: &ReducerContext) -> Result<(), String> {
    if ctx.db.admin_identities().count() > 0 {
        require_admin(ctx)?;
    }

    ctx.db.admin_identities().insert(AdminIdentity {
        identity: ctx.sender,
    });

    Ok(())
}

// TODO Research if we can apply permissions before parsing args.
#[reducer]
pub fn admin_apply_bundle(ctx: &ReducerContext, bundle: AdminBundle) -> Result<(), String> {
    require_admin(ctx)?;

    // TODO Before clearing existing tables, store full contents in memory. Iterate
    // existing components that use assets and replace every old index with the new one.

    for a in ctx.db.action_steps().iter() {
        ctx.db.action_steps().delete(a);
    }
    for a in ctx.db.actions().iter() {
        ctx.db.actions().delete(a);
    }
    for a in &bundle.actions {
        ctx.db.actions().insert(a.clone());
    }
    for s in &bundle.action_steps {
        ctx.db.action_steps().insert(s.clone());
    }

    for b in ctx.db.baselines().iter() {
        ctx.db.baselines().delete(b);
    }
    for b in &bundle.baselines {
        ctx.db.baselines().insert(b.clone());
    }

    for t in ctx.db.traits().iter() {
        ctx.db.traits().delete(t);
    }
    for t in &bundle.traits {
        ctx.db.traits().insert(t.clone());
    }

    for seb in ctx.db.special_entity_blobs().iter() {
        ctx.db.special_entity_blobs().delete(seb);
    }
    for seb in &bundle.special_entity_blobs {
        ctx.db.special_entity_blobs().insert(seb.clone());
    }

    Ok(())
}

#[reducer]
pub fn create_player_for_self(
    ctx: &ReducerContext,
    allegiance_name: &str,
    starting_room_name: &str,
    baseline_name: &str,
    trait_names: Vec<String>,
) -> Result<(), String> {
    require_admin(ctx)?;

    if ctx.ecs().from_player_identity().is_some() {
        return Err("Player already exists for this identity.".to_string());
    }

    let allegiance_id = ctx
        .ecs()
        .from_name(allegiance_name)
        .ok_or("Cannot find allegiance.")?
        .entity_id();
    let room_id = ctx
        .ecs()
        .from_name(starting_room_name)
        .ok_or("Cannot find starting room.")?
        .entity_id();

    let mut e = ctx
        .ecs()
        .new()
        .upsert_new_player_controller(ctx.sender)
        .upsert_new_allegiance(allegiance_id)
        .upsert_new_location(room_id)
        .into_handle()
        .set_baseline(baseline_name);

    for t in trait_names {
        e = e.add_trait(&t);
    }

    Ok(())
}

#[reducer]
pub fn admin_recreate_player_for_identity(
    ctx: &ReducerContext,
    identity: Identity,
    allegiance_name: &str,
    starting_room_name: &str,
    baseline_name: &str,
    trait_names: Vec<String>,
) -> Result<(), String> {
    require_admin(ctx)?;

    if let Some(pc) = ctx
        .db
        .player_controller_components()
        .identity()
        .find(identity)
    {
        ctx.ecs().into_player_controller_handle(pc).delete();
    }

    let allegiance_id = ctx
        .ecs()
        .from_name(allegiance_name)
        .ok_or("Cannot find allegiance.")?
        .entity_id();
    let room_id = ctx
        .ecs()
        .from_name(starting_room_name)
        .ok_or("Cannot find starting room.")?
        .entity_id();

    let mut e = ctx
        .ecs()
        .new()
        .upsert_new_player_controller(identity)
        .upsert_new_allegiance(allegiance_id)
        .upsert_new_location(room_id)
        .into_handle()
        .set_baseline(baseline_name);

    for t in trait_names {
        e = e.add_trait(&t);
    }

    Ok(())
}

#[reducer]
pub fn admin_damage(ctx: &ReducerContext, entity_id: u64, damage: i32) -> Result<(), String> {
    require_admin(ctx)?;
    let mut hp = { ctx.ecs().find(entity_id).hp() }.ok_or("Cannot find entity with hp.")?;
    hp.accumulated_damage += damage;
    ctx.db.hp_components().entity_id().update(hp);

    Ok(())
}

#[reducer]
pub fn admin_add_trait(
    ctx: &ReducerContext,
    entity_id: u64,
    trait_name: &str,
) -> Result<(), String> {
    require_admin(ctx)?;
    ctx.ecs().find(entity_id).add_trait(trait_name);

    Ok(())
}
