use ecs::{Ecs, WithEcs};
use spacetimedb::{reducer, ReducerContext};

use crate::{
    action::{actions, special_actions},
    asset::{baseline::baselines, stance::stances},
    ecs_extension::EcsExtension,
    entity::*,
    entity_handle_extension::EntityHandleExtension,
    item::{ItemRef, StanceCustomization},
    stat_group::ReadinessBlock,
};
use spacetimedb::Table;

/// Gear validation, whole and entire: the item ENTITY must be OWNED (located
/// in the wielder — carrying IS location) and of the expected kind. An item
/// is one thing, so there is no counting; two swords are two entities.
fn owned_item_ref(
    ecs: &Ecs,
    owner_entity_id: u64,
    item_entity_id: u64,
) -> Result<ItemRef, String> {
    let located_here = ecs
        .db
        .location_components()
        .entity_id()
        .find(item_entity_id)
        .is_some_and(|l| l.location_entity_id == owner_entity_id);
    if !located_here {
        return Err(format!("Item {} is not owned.", item_entity_id));
    }
    ecs.db
        .item_components()
        .entity_id()
        .find(item_entity_id)
        .map(|i| i.item_ref)
        .ok_or_else(|| format!("Entity {} is not an item.", item_entity_id))
}

/// The one refusal message when a configuration would over-run a STEADY
/// capacity (grip, the body slot, the relic slots). Over-equipping is allowed
/// only to outrun a transient STATUS — never a steadier stat source — so an
/// item that will not fit the steady base is refused outright, not silently
/// dropped from the stats.
fn over_capacity_error(item_entity_id: u64) -> String {
    format!(
        "Item {} would exceed a steady capacity (grip, body, or relic slots); \
         over-equipping may only outrun a temporary status effect.",
        item_entity_id
    )
}

/// Equip the single global clothing/armor slot from an owned armor ITEM.
#[reducer]
pub fn set_armor(ctx: &ReducerContext, item_entity_id: u64) -> Result<(), String> {
    let ecs = ctx.ecs();
    let p = ecs
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    match owned_item_ref(&ecs, p.entity_id(), item_entity_id)? {
        ItemRef::Armor => {}
        other => return Err(format!("Item {} is not armor ({:?}).", item_entity_id, other)),
    }
    let ph = ecs.find(p.entity_id());
    if let Some(overflow) =
        ph.first_overflowing_equipment(ph.steady_capacity_base(None), &[item_entity_id])
    {
        return Err(over_capacity_error(overflow));
    }
    p.into_handle().upsert_new_armor(item_entity_id);
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

/// Wear up to four relics, all from owned relic ITEMS; applied across every
/// stance.
#[reducer]
pub fn set_relics(ctx: &ReducerContext, relic_entity_ids: Vec<u64>) -> Result<(), String> {
    if relic_entity_ids.len() > 4 {
        return Err(format!(
            "At most 4 relics may be worn; {} requested.",
            relic_entity_ids.len()
        ));
    }
    let ecs = ctx.ecs();
    let p = ecs
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    for id in &relic_entity_ids {
        match owned_item_ref(&ecs, p.entity_id(), *id)? {
            ItemRef::Relic => {}
            other => return Err(format!("Item {} is not a relic ({:?}).", id, other)),
        }
    }
    let ph = ecs.find(p.entity_id());
    if let Some(overflow) =
        ph.first_overflowing_equipment(ph.steady_capacity_base(None), &relic_entity_ids)
    {
        return Err(over_capacity_error(overflow));
    }
    p.into_handle().upsert_new_relics(relic_entity_ids);
    Ok(())
}

/// The GEARED READINESS: base parts rebuilt explicitly (baseline plus traits,
/// worn armor/relics, and the given armaments) — never the current equipment
/// cache, and no stance: the base every stance compares to. Actions are derived
/// from readiness, so this readiness (through actions_meeting) yields the
/// DEFAULT bar's candidate set. Every gear contribution is the item's own
/// Equippable readiness.
fn geared_readiness(
    ctx: &ReducerContext,
    player_entity_id: u64,
    armament_entity_ids: &[u64],
) -> ReadinessBlock {
    let ecs = ctx.ecs();
    let handle = ecs.find(player_entity_id);
    let mut geared = { handle.baseline() }
        .and_then(|b| ctx.db.baselines().id().find(b.baseline_id))
        .map(|b| b.readiness)
        .unwrap_or_default();
    if let Some(c) = handle.traits_readiness_cache() {
        geared += &c.readiness;
    }
    let mut add_item = |item_entity_id: u64| {
        if let Some(q) = ecs.find(item_entity_id).equippable() {
            geared += &q.readiness;
        }
    };
    if let Some(c) = handle.armor() {
        add_item(c.armor_entity_id);
    }
    if let Some(c) = handle.relics() {
        for id in &c.relic_entity_ids {
            add_item(*id);
        }
    }
    for id in armament_entity_ids {
        add_item(*id);
    }
    geared
}

/// The candidate READINESS a stance customization would produce: the geared
/// base plus the stance itself. Through actions_meeting this yields the stance's
/// full candidate action set.
fn candidate_readiness(
    ctx: &ReducerContext,
    player_entity_id: u64,
    stance: &crate::asset::stance::Stance,
    armament_entity_ids: &[u64],
) -> ReadinessBlock {
    let mut candidate = geared_readiness(ctx, player_entity_id, armament_entity_ids);
    candidate += &stance.readiness;
    candidate
}

/// The action ids whose requirements the given readiness meets: the candidate
/// set a bar assignment is validated against, mirroring how the derived
/// ActionsComponent is built.
fn actions_meeting(ctx: &ReducerContext, readiness: &ReadinessBlock) -> Vec<u32> {
    ctx.db
        .actions()
        .iter()
        .filter(|a| readiness.meets(&a.requirements))
        .map(|a| a.id)
        .collect()
}

/// Replace one stance's customization entry via `update`, preserving the rest.
fn update_stance_customization(
    ctx: &ReducerContext,
    player_entity_id: u64,
    stance_id: u32,
    update: impl FnOnce(StanceCustomization) -> StanceCustomization,
) {
    let handle = ctx.ecs().find(player_entity_id);
    let mut assignments = { handle.stance_customizations() }
        .map(|c| c.assignments)
        .unwrap_or_default();
    let existing = assignments
        .iter()
        .find(|a| a.stance_id == stance_id)
        .cloned()
        .unwrap_or(StanceCustomization {
            stance_id,
            armament_entity_ids: None,
            action_ids: None,
        });
    assignments.retain(|a| a.stance_id != stance_id);
    assignments.push(update(existing));
    handle.upsert_new_stance_customizations(assignments);
}

/// Assign one stance's armament OVERRIDE — explicit intent, never inferred
/// from emptiness: None removes the override (the stance fights with the
/// DEFAULT set), Some(vec![]) is deliberately bare hands, Some(ids) is an
/// override naming exactly these owned item ENTITIES. The override is GATED
/// against this stance's steady capacity (status excluded): it must fit the
/// grip the stance leaves. Assigning the ACTIVE stance takes effect
/// immediately; other stances' customizations apply as data now and arm when a
/// stance change adopts them (paying its round).
#[reducer]
pub fn assign_stance_armaments(
    ctx: &ReducerContext,
    stance_id: u32,
    armament_entity_ids: Option<Vec<u64>>,
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
    if let Some(override_ids) = &armament_entity_ids {
        for id in override_ids {
            match owned_item_ref(&ecs, p.entity_id(), *id)? {
                ItemRef::Armament => {}
                other => {
                    return Err(format!("Item {} is not an armament ({:?}).", id, other))
                }
            }
        }
        // The stance is a steadier source than equipment, so the override is
        // gated against this stance's own capacity (status excluded). Adopting
        // a penalizing stance can still leave the DEFAULT set over capacity —
        // that transient invalidity is allowed and drops stats live — but a
        // deliberate per-stance override must fit that stance outright.
        let ph = ecs.find(p.entity_id());
        if let Some(overflow) = ph.first_overflowing_equipment(
            ph.steady_capacity_base(Some(&stance.body_capacity)),
            override_ids,
        ) {
            return Err(over_capacity_error(overflow));
        }
    }

    // Configuration only — applied immediately. When this stance is the
    // ACTIVE one, the reconciliation system sees the divergence and
    // forces the re-arm round; other stances arm when a change adopts
    // them. Consistency is system-imposed, never per-mutator.
    update_stance_customization(ctx, p.entity_id(), stance_id, |customization| {
        StanceCustomization {
            armament_entity_ids,
            ..customization
        }
    });
    Ok(())
}

/// Assign the DEFAULT armament set — the owned item ENTITIES the hands hold
/// when the active stance assigns no override. A MENU path: core
/// configuration changes IMMEDIATELY (the menu reflects it at once), and the
/// SERVER alone decides whether the change also queues any in-fiction action
/// as a consequence — today the swap is instant; a future combat rule may
/// queue a re-arm here without the client changing at all. The equip/unequip
/// ACTS remain the in-world item path (offered on items), editing this same
/// slot from the fiction's side.
#[reducer]
pub fn set_default_armaments(
    ctx: &ReducerContext,
    armament_entity_ids: Vec<u64>,
) -> Result<(), String> {
    let ecs = ctx.ecs();
    let p = ecs
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    let player_entity_id = p.entity_id();
    for id in &armament_entity_ids {
        match owned_item_ref(&ecs, player_entity_id, *id)? {
            ItemRef::Armament => {}
            other => return Err(format!("Item {} is not an armament ({:?}).", id, other)),
        }
    }
    // The DEFAULT set is stance-free — the base every stance rides — so it is
    // gated against the stance-free steady base (status excluded). This is the
    // grip gate that keeps a hundred weapons off the hands; a penalizing
    // stance may later drop some of these stats, but the set itself must fit.
    let ph = ecs.find(player_entity_id);
    if let Some(overflow) =
        ph.first_overflowing_equipment(ph.steady_capacity_base(None), &armament_entity_ids)
    {
        return Err(over_capacity_error(overflow));
    }
    // Configuration only — applied immediately; the reconciliation
    // system converges the hands (forcing the re-arm round when the
    // active stance rides the defaults). Consistency is system-imposed.
    ecs.find(player_entity_id)
        .upsert_new_default_armaments(armament_entity_ids);
    Ok(())
}

/// The COMMON verbs every bar may pin for a stable slot: the registered
/// special actions (take, drop, equip, unequip, eat, move) — offered or
/// derived in play, absent from any granted set, but configurable all
/// the same. The system-only re-arm never joins a bar.
fn common_pinnable_action_ids(ctx: &ReducerContext) -> Vec<u32> {
    ctx.db
        .special_actions()
        .iter()
        .filter(|s| s.key != crate::action::SpecialActionKey::Rearm)
        .map(|s| s.action_id)
        .collect()
}

/// The bar hotkey positions cap the pinned set.
const MAX_ASSIGNED_ACTIONS: usize = 10;

/// Assign the ACTIONS one stance pins to the bar, in bar order (position is
/// the hotkey). Each must come from the stance's candidate set — what the
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

        // The candidate set reflects what the stance will ACTUALLY fight
        // with: its armament override when it has one, else the default
        // wielded set.
        let handle = ecs.find(p.entity_id());
        let stance_armament_entity_ids = { handle.stance_customizations() }
            .map(|c| c.assignments)
            .unwrap_or_default()
            .iter()
            .find(|a| a.stance_id == stance_id)
            .and_then(|a| a.armament_entity_ids.clone())
            .or_else(|| handle.default_armaments().map(|d| d.armament_entity_ids))
            .unwrap_or_default();
        let mut candidates = actions_meeting(
            ctx,
            &candidate_readiness(ctx, p.entity_id(), &stance, &stance_armament_entity_ids),
        );
        // The common verbs are always pinnable: their slot is the point.
        candidates.extend(common_pinnable_action_ids(ctx));
        for id in bar_ids {
            if !candidates.contains(id) {
                let name = ctx
                    .db
                    .actions()
                    .id()
                    .find(id)
                    .map_or_else(|| format!("#{}", id), |a| a.name);
                return Err(format!(
                    "The action \"{}\" is not in this stance's candidate set.",
                    name
                ));
            }
        }
    }

    update_stance_customization(ctx, p.entity_id(), stance_id, |customization| {
        StanceCustomization {
            action_ids: action_ids.clone(),
            ..customization
        }
    });
    // Everything the stance menu derives applies IMMEDIATELY for the
    // ACTIVE stance: a bar assignment (Some, even empty) becomes the
    // pinned bar now; None falls back to the DEFAULT bar when one is
    // configured — the same rule adoption applies.
    let handle = ecs.find(p.entity_id());
    if { handle.active_stance() }.is_some_and(|a| a.stance_id == stance_id) {
        let default_bar = { handle.default_actions() }.map(|d| d.action_ids);
        if let Some(bar_ids) = action_ids.or(default_bar) {
            handle.upsert_new_pinned_actions(bar_ids);
        }
    }
    Ok(())
}

/// Assign the DEFAULT action bar — what a stance change pins when the
/// adopted stance carries no bar assignment of its own, mirroring the
/// default armament slot. The candidate set is the DEFAULT configuration's
/// candidates: base + worn gear + default armaments, NO stance (the
/// base every stance compares to). The ACTIVE stance rides it live when
/// it has no override of its own.
#[reducer]
pub fn set_default_actions(ctx: &ReducerContext, action_ids: Vec<u32>) -> Result<(), String> {
    if action_ids.len() > MAX_ASSIGNED_ACTIONS {
        return Err(format!(
            "At most {} actions fit the bar; {} requested.",
            MAX_ASSIGNED_ACTIONS,
            action_ids.len()
        ));
    }
    let ecs = ctx.ecs();
    let p = ecs
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    let player_entity_id = p.entity_id();
    let handle = ecs.find(player_entity_id);
    let default_armament_entity_ids = { handle.default_armaments() }
        .map(|d| d.armament_entity_ids)
        .unwrap_or_default();
    let mut candidates = actions_meeting(
        ctx,
        &geared_readiness(ctx, player_entity_id, &default_armament_entity_ids),
    );
    // The common verbs are always pinnable: their slot is the point.
    candidates.extend(common_pinnable_action_ids(ctx));
    for id in &action_ids {
        if !candidates.contains(id) {
            let name = ctx
                .db
                .actions()
                .id()
                .find(id)
                .map_or_else(|| format!("#{}", id), |a| a.name);
            return Err(format!(
                "The action \"{}\" is not in the default configuration's candidate set.",
                name
            ));
        }
    }
    ecs.find(player_entity_id)
        .upsert_new_default_actions(action_ids.clone());
    // The active stance without a bar override rides the default: apply now.
    let handle = ecs.find(player_entity_id);
    let active_has_override = { handle.active_stance() }.is_some_and(|active| {
        { handle.stance_customizations() }.is_some_and(|customizations| {
            customizations
                .assignments
                .iter()
                .any(|a| a.stance_id == active.stance_id && a.action_ids.is_some())
        })
    });
    if !active_has_override {
        ecs.find(player_entity_id).upsert_new_pinned_actions(action_ids);
    }
    Ok(())
}
