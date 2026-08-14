use ecs::{Ecs, WithEcs};
use spacetimedb::{reducer, ReducerContext};

use crate::{
    action::actions,
    asset::{
        armament::armaments, armor::armors, baseline::baselines, relic::relics,
        stance::stances, stat_block::StatBlock,
    },
    ecs_extension::EcsExtension,
    entity::*,
    entity_handle_extension::EntityHandleExtension,
    item::{ItemRef, StanceLoadout},
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

/// The candidate context a stance loadout would produce: base parts
/// rebuilt explicitly (baseline + traits + worn armor/relics + the
/// CANDIDATE armaments + the stance) — never the current equipment cache.
/// Its action_ids are the stance's full candidate action pool.
fn candidate_stat_block(
    ctx: &ReducerContext,
    player_entity_id: u64,
    stance: &crate::asset::stance::Stance,
    armament_ids: &[u32],
) -> StatBlock {
    let ecs = ctx.ecs();
    let handle = ecs.find(player_entity_id);
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
    for id in armament_ids {
        if let Some(a) = ctx.db.armaments().id().find(id) {
            candidate += &a.stat_block;
        }
    }
    candidate += &stance.stat_block;
    candidate
}

/// Replace one stance's loadout entry via `update`, preserving the rest.
fn update_stance_loadout(
    ctx: &ReducerContext,
    player_entity_id: u64,
    stance_id: u32,
    update: impl FnOnce(StanceLoadout) -> StanceLoadout,
) {
    let handle = ctx.ecs().find(player_entity_id);
    let mut assignments = { handle.stance_loadouts() }
        .map(|c| c.assignments)
        .unwrap_or_default();
    let existing = assignments
        .iter()
        .find(|a| a.stance_id == stance_id)
        .cloned()
        .unwrap_or(StanceLoadout {
            stance_id,
            armament_ids: None,
            action_ids: None,
        });
    assignments.retain(|a| a.stance_id != stance_id);
    assignments.push(update(existing));
    handle.upsert_new_stance_loadouts(assignments);
}

/// Assign one stance's armament OVERRIDE — explicit intent, never inferred
/// from emptiness: None removes the override (the stance fights with the
/// DEFAULT set), Some(vec![]) is deliberately bare hands, Some(ids) is an
/// override. Preparation-time validation happens HERE, where the player
/// can read the outcome: overriding armaments must be owned, and the
/// candidate context (base + gear + stance) must keep every counted
/// property non-negative — two hands cannot hold three one-handed blades.
/// Assigning the ACTIVE stance takes effect immediately; other stances'
/// loadouts apply as data now and arm when a stance change adopts them
/// (paying its round).
#[reducer]
pub fn assign_stance_armaments(
    ctx: &ReducerContext,
    stance_id: u32,
    armament_ids: Option<Vec<u32>>,
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
    if let Some(override_ids) = &armament_ids {
        for id in override_ids {
            ctx.db
                .armaments()
                .id()
                .find(id)
                .ok_or_else(|| format!("Unknown armament id {}.", id))?;
        }
        let requested: Vec<ItemRef> = override_ids
            .iter()
            .map(|id| ItemRef::Armament(*id))
            .collect();
        require_owned(&ecs, p.entity_id(), &requested)?;

        // The grip rule: two hands cannot hold three one-handed blades.
        // (Other counted properties gain their own feasibility rules as
        // they need them.)
        let candidate = candidate_stat_block(ctx, p.entity_id(), &stance, override_ids);
        if candidate.hand < 0 {
            return Err(format!(
                "This loadout needs {} more grip than the body provides.",
                -i32::from(candidate.hand)
            ));
        }
    }

    update_stance_loadout(ctx, p.entity_id(), stance_id, |loadout| StanceLoadout {
        armament_ids,
        ..loadout
    });
    // Assigning the ACTIVE stance takes effect IMMEDIATELY: the hands
    // re-resolve (this override when non-empty, else the default set —
    // clearing an active override falls back to the default). Other
    // stances arm when a stance change adopts them.
    let entity = ecs.find(p.entity_id());
    if { entity.active_stance() }.is_some_and(|a| a.stance_id == stance_id) {
        entity.apply_resolved_armaments();
    }
    Ok(())
}

/// The bar hotkey positions cap the pinned set.
const MAX_ASSIGNED_ACTIONS: usize = 10;

/// Assign the ACTIONS one stance pins to the bar, in bar order (position is
/// the hotkey). Each must come from the stance's candidate pool — what the
/// body, traits, worn gear, ASSIGNED armaments, and the stance itself
/// grant. Same configuration-only rule as armaments: the bar actually
/// changes when a stance change pays its round.
#[reducer]
pub fn assign_stance_actions(
    ctx: &ReducerContext,
    stance_id: u32,
    action_ids: Option<Vec<u32>>,
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
    if let Some(bar_ids) = &action_ids {
        if bar_ids.len() > MAX_ASSIGNED_ACTIONS {
            return Err(format!(
                "At most {} actions fit the bar; {} requested.",
                MAX_ASSIGNED_ACTIONS,
                bar_ids.len()
            ));
        }

        // The candidate pool reflects what the stance will ACTUALLY fight
        // with: its armament override when it has one, else the default
        // wielded set.
        let handle = ecs.find(p.entity_id());
        let stance_armament_ids = { handle.stance_loadouts() }
            .map(|c| c.assignments)
            .unwrap_or_default()
            .iter()
            .find(|a| a.stance_id == stance_id)
            .and_then(|a| a.armament_ids.clone())
            .or_else(|| handle.default_armaments().map(|d| d.armament_ids))
            .unwrap_or_default();
        let pool =
            candidate_stat_block(ctx, p.entity_id(), &stance, &stance_armament_ids)
                .action_ids;
        for id in bar_ids {
            if !pool.contains(id) {
                let name = ctx
                    .db
                    .actions()
                    .id()
                    .find(id)
                    .map_or_else(|| format!("#{}", id), |a| a.name);
                return Err(format!(
                    "The action \"{}\" is not in this stance's candidate pool.",
                    name
                ));
            }
        }
    }

    update_stance_loadout(ctx, p.entity_id(), stance_id, |loadout| StanceLoadout {
        action_ids: action_ids.clone(),
        ..loadout
    });
    // Everything the stance menu derives applies IMMEDIATELY for the
    // ACTIVE stance: a bar assignment (Some, even empty) becomes the
    // pinned bar now; None (no assignment) leaves the bar alone.
    let handle = ecs.find(p.entity_id());
    if let Some(bar_ids) = action_ids {
        if { handle.active_stance() }.is_some_and(|a| a.stance_id == stance_id) {
            handle.upsert_new_pinned_actions(bar_ids);
        }
    }
    Ok(())
}
