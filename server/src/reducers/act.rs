use ecs::WithEcs;
use spacetimedb::{reducer, ReducerContext};

use crate::{
    action::ActionId, ecs_extension::EcsExtension, entity_handle_extension::EntityHandleExtension,
};

#[reducer]
pub fn act(ctx: &ReducerContext, action_id: ActionId, target_entity_id: u64) -> Result<(), String> {
    if let Some(p) = ctx.ecs().from_player_identity(ctx.sender()) {
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
