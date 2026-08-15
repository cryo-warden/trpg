use ecs::WithEcs;
use spacetimedb::{reducer, ReducerContext};

use crate::{
    action::ActionId, ecs_extension::EcsExtension, entity::*,
    entity_handle_extension::EntityHandleExtension,
};

#[reducer]
pub fn act(ctx: &ReducerContext, action_id: ActionId, target_entity_id: u64) -> Result<(), String> {
    if let Some(p) = ctx.ecs().from_player_identity(ctx.sender()) {
        if p.respawn_timer().is_some() {
            return Err("You are dead; nothing acts until the respawn.".to_string());
        }
        if p.can_target_other(target_entity_id, action_id) {
            p.enqueue_manual_action(action_id, target_entity_id);
            Ok(())
        } else {
            Err("Invalid target for the given action.".to_string())
        }
    } else {
        Err("Cannot find a player entity.".to_string())
    }
}

/// Adopt a stance directly (dev/menu path — the in-fiction path is a
/// round-costing Posture action carrying a SetStance effect; both share
/// try_adopt_stance's gates).
#[reducer]
pub fn set_stance(ctx: &ReducerContext, stance_id: u32) -> Result<(), String> {
    let p = ctx
        .ecs()
        .from_player_identity(ctx.sender())
        .ok_or("Cannot find a player entity.")?;
    if p.respawn_timer().is_some() {
        return Err("You are dead; nothing acts until the respawn.".to_string());
    }
    p.try_adopt_stance(stance_id)
}
