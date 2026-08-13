use ecs::{Ecs, WithEcs};
use spacetimedb::{reducer, ReducerContext};

use crate::{
    asset::{
        armament::armaments, armor::armors, baseline::baselines, relic::relics,
        stance::stances, stat_block::StatBlock,
    },
    ecs_extension::EcsExtension,
    entity::*,
    item::{ItemRef, StanceArmaments},
};

/// Counts the gear the entity carries (carrying IS location), per matching
/// asset id. Duplicated asset ids in a request need that many owned items —
/// the counted-multiset rule.
fn owned_count(ecs: &Ecs, owner_entity_id: u64, wanted: &ItemRef) -> usize {
    ecs.db
        .location_components()
        .location_entity_id()
        .filter(owner_entity_id)
        .filter(|carried| {
            ecs.db
                .item_components()
                .entity_id()
                .find(carried.entity_id)
                .is_some_and(|item| match (&item.item_ref, wanted) {
                    (ItemRef::Armament(a), ItemRef::Armament(b)) => a == b,
                    (ItemRef::Armor(a), ItemRef::Armor(b)) => a == b,
                    (ItemRef::Relic(a), ItemRef::Relic(b)) => a == b,
                    _ => false,
                })
        })
        .count()
}

/// Every requested asset id must be covered by that many owned items.
fn require_owned(
    ecs: &Ecs,
    owner_entity_id: u64,
    requested: &[ItemRef],
) -> Result<(), String> {
    for wanted in requested {
        let needed = requested
            .iter()
            .filter(|r| match (*r, wanted) {
                (ItemRef::Armament(a), ItemRef::Armament(b)) => a == b,
                (ItemRef::Armor(a), ItemRef::Armor(b)) => a == b,
                (ItemRef::Relic(a), ItemRef::Relic(b)) => a == b,
                _ => false,
            })
            .count();
        if owned_count(ecs, owner_entity_id, wanted) < needed {
            return Err(format!(
                "Not enough owned items to cover {:?} x{}.",
                wanted, needed
            ));
        }
    }
    Ok(())
}

/// Equip the single global clothing/armor slot from an owned armor item.
#[reducer]
pub fn set_armor(ctx: &ReducerContext, armor_id: u32) -> Result<(), String> {
    let ecs = ctx.ecs();
    let p = ecs
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    ctx.db
        .armors()
        .id()
        .find(armor_id)
        .ok_or_else(|| format!("Unknown armor id {}.", armor_id))?;
    require_owned(&ecs, p.entity_id(), &[ItemRef::Armor(armor_id)])?;
    p.into_handle().upsert_new_armor(armor_id);
    Ok(())
}

#[reducer]
pub fn clear_armor(ctx: &ReducerContext) -> Result<(), String> {
    let p = ctx
        .ecs()
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    p.into_handle().delete_armor();
    Ok(())
}

/// Wear up to four relics, all from owned relic items; applied across every
/// stance.
#[reducer]
pub fn set_relics(ctx: &ReducerContext, relic_ids: Vec<u32>) -> Result<(), String> {
    if relic_ids.len() > 4 {
        return Err(format!(
            "At most 4 relics may be worn; {} requested.",
            relic_ids.len()
        ));
    }
    let ecs = ctx.ecs();
    let p = ecs
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    for id in &relic_ids {
        ctx.db
            .relics()
            .id()
            .find(id)
            .ok_or_else(|| format!("Unknown relic id {}.", id))?;
    }
    let requested: Vec<ItemRef> = relic_ids.iter().map(|id| ItemRef::Relic(*id)).collect();
    require_owned(&ecs, p.entity_id(), &requested)?;
    p.into_handle().upsert_new_relics(relic_ids);
    Ok(())
}

/// Assign armaments to one stance in the player's loadouts. Preparation-time
/// validation happens HERE, where the player can read the outcome: the
/// armaments must be owned, and the candidate context (base + gear + stance)
/// must keep every counted property non-negative — two hands cannot hold
/// three one-handed blades.
#[reducer]
pub fn assign_stance_armaments(
    ctx: &ReducerContext,
    stance_id: u32,
    armament_ids: Vec<u32>,
) -> Result<(), String> {
    let ecs = ctx.ecs();
    let p = ecs
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    let stance = ctx
        .db
        .stances()
        .id()
        .find(stance_id)
        .ok_or_else(|| format!("Unknown stance id {}.", stance_id))?;
    for id in &armament_ids {
        ctx.db
            .armaments()
            .id()
            .find(id)
            .ok_or_else(|| format!("Unknown armament id {}.", id))?;
    }
    let requested: Vec<ItemRef> = armament_ids
        .iter()
        .map(|id| ItemRef::Armament(*id))
        .collect();
    require_owned(&ecs, p.entity_id(), &requested)?;

    // The candidate context this loadout would produce. base_stat_block
    // includes the CURRENT equipment cache, so rebuild gear explicitly from
    // the candidate parts instead.
    let handle = p.to_handle().clone();
    let mut candidate = { handle.baseline() }
        .and_then(|b| ctx.db.baselines().id().find(b.baseline_id))
        .map_or_else(StatBlock::default, |b| b.stat_block);
    if let Some(c) = handle.traits_stat_block_cache() {
        candidate += &c.stat_block;
    }
    if let Some(c) = handle.armor() {
        if let Some(a) = ctx.db.armors().id().find(c.armor_id) {
            candidate += &a.stat_block;
        }
    }
    if let Some(c) = handle.relics() {
        for id in &c.relic_ids {
            if let Some(r) = ctx.db.relics().id().find(id) {
                candidate += &r.stat_block;
            }
        }
    }
    for id in &armament_ids {
        if let Some(a) = ctx.db.armaments().id().find(id) {
            candidate += &a.stat_block;
        }
    }
    // The grip rule: two hands cannot hold three one-handed blades. (Other
    // counted properties gain their own feasibility rules as they need
    // them.)
    candidate += &stance.stat_block;
    if candidate.hand < 0 {
        return Err(format!(
            "This loadout needs {} more grip than the body provides.",
            -i32::from(candidate.hand)
        ));
    }

    let mut assignments = { handle.stance_loadouts() }
        .map(|c| c.assignments)
        .unwrap_or_default();
    assignments.retain(|a| a.stance_id != stance_id);
    assignments.push(StanceArmaments {
        stance_id,
        armament_ids,
    });
    handle.upsert_new_stance_loadouts(assignments);

    // CONFIGURATION ONLY: the loadout applies immediately as data, but the
    // ACTUAL equipment changes solely through a stance change — which costs
    // a round (the posture actions). Even re-entering the current stance
    // pays that round to re-arm.
    Ok(())
}
