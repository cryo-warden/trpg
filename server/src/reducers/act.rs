use ecs::WithEcs;
use spacetimedb::{reducer, ReducerContext};

use crate::{
    action::ActionId, asset::stance::stances, ecs_extension::EcsExtension, entity::*,
    entity_handle_extension::EntityHandleExtension,
};

#[reducer]
pub fn act(ctx: &ReducerContext, action_id: ActionId, target_entity_id: u64) -> Result<(), String> {
    if let Some(p) = ctx.ecs().from_player_identity(ctx.sender()) {
        if p.respawn_timer().is_some() {
            return Err("The death-trance holds; no acting until you wake.".to_string());
        }
        if p.can_target_other(target_entity_id, action_id) {
            p.set_queued_action_state(action_id, target_entity_id);
            Ok(())
        } else {
            Err("Invalid target for the given action.".to_string())
        }
    } else {
        Err("Cannot find a player entity.".to_string())
    }
}

/// Adopt a stance. Instant for now; the one-round swap cost arrives with the
/// prepared-loadout action in the next phase.
#[reducer]
pub fn set_stance(ctx: &ReducerContext, stance_id: u32) -> Result<(), String> {
    let p = ctx
        .ecs()
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    if p.respawn_timer().is_some() {
        return Err("The death-trance holds; no acting until you wake.".to_string());
    }
    let stance = ctx
        .db
        .stances()
        .id()
        .find(stance_id)
        .ok_or_else(|| format!("Unknown stance id {}.", stance_id))?;
    // A fear status holds the cower until effective morale (rigid morale
    // plus rallied courage, best in the present faction) overcomes the
    // highest intimidation received.
    if let Some(fear) = p.fear_status() {
        let nerve = p.effective_morale();
        if nerve <= i32::from(fear.intimidation) {
            return Err(format!(
                "Too shaken to change stance: morale {} does not overcome the fear {}.",
                nerve, fear.intimidation
            ));
        }
    }
    // Only KNOWN stances may be adopted: the total stat block grants them
    // (bodies now, quest rewards later), and the menu lists exactly these.
    if !{ p.known_stances() }.is_some_and(|known| known.stance_ids.contains(&stance_id)) {
        return Err(format!(
            "The stance \"{}\" is not among this entity's known stances.",
            stance.name
        ));
    }
    // Checked against the stance-free base: a stance never provides the
    // properties needed to enter itself.
    if !p.base_stat_block().meets(&stance.requirements) {
        return Err(format!(
            "The requirements of stance \"{}\" are not met.",
            stance.name
        ));
    }
    // A deliberate stance change sheds the momentary statuses: the fear is
    // overcome, the surge of courage spent, the brace abandoned.
    let handle = p.into_handle();
    if handle.fear_status().is_some() {
        handle.delete_fear_status();
    }
    if handle.courage_status().is_some() {
        handle.delete_courage_status();
    }
    if handle.braced_status().is_some() {
        handle.delete_braced_status();
    }
    let handle = handle.upsert_new_active_stance(stance_id).into_handle();

    // A player with stance loadouts re-arms on swap: the new stance's
    // assigned armaments (or none, when unassigned) become the wielded set.
    // Entities without loadouts (NPCs, uncustomized players) keep their flat
    // blob-authored equipment.
    if let Some(loadouts) = handle.stance_loadouts() {
        let armament_ids = loadouts
            .assignments
            .iter()
            .find(|a| a.stance_id == stance_id)
            .map(|a| a.armament_ids.to_owned())
            .unwrap_or_default();
        handle.upsert_new_equipment(armament_ids);
    }
    Ok(())
}
