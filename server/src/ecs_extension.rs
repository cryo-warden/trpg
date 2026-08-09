use crate::{
    asset::ReducerContextExtension, entity::*,
    entity_handle_extension::InstantiateEntityBlobExtension,
};
use ecs::Ecs;
use spacetimedb::Identity;

pub trait EcsExtension<'a> {
    fn instantiation_scope(self) -> InstantiationScope<'a>;
    fn new_room(
        self,
        blob: EntityBlob,
        location_map_entity_id: u64,
    ) -> Result<EntityHandle<'a>, String>;
    fn new_path(
        self,
        blob: EntityBlob,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> Result<EntityHandle<'a>, String>;
    fn from_player_identity(
        self,
        identity: Identity,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>>;
    fn new_player(
        self,
        identity: Identity,
    ) -> Result<player_controller_component::WithComponent<EntityHandle<'a>>, String>;
}

impl<'a> EcsExtension<'a> for Ecs<'a> {
    fn instantiation_scope(self) -> InstantiationScope<'a> {
        InstantiationScope {
            ecs: self,
            locals: vec![],
        }
    }
    fn new_room(
        self,
        blob: EntityBlob,
        location_map_entity_id: u64,
    ) -> Result<EntityHandle<'a>, String> {
        Ok(self
            .new()
            .instantiate_blob(blob, &self.instantiation_scope())?
            .upsert_new_location_map(location_map_entity_id)
            .into_handle())
    }
    fn new_path(
        self,
        blob: EntityBlob,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> Result<EntityHandle<'a>, String> {
        Ok(self
            .new()
            .instantiate_blob(blob, &self.instantiation_scope())?
            .upsert_new_location(location_entity_id)
            .upsert_new_path(destination_entity_id)
            .into_handle())
    }
    fn from_player_identity(
        self,
        identity: Identity,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>> {
        self.db
            .player_controller_components()
            .identity()
            .find(identity)
            .map(|p| self.into_player_controller_handle(p))
    }

    fn new_player(
        self,
        identity: Identity,
    ) -> Result<player_controller_component::WithComponent<EntityHandle<'a>>, String> {
        // The new-player blob carries its own references (e.g. the starting
        // allegiance as a Named selector), so instantiation needs nothing
        // beyond an empty scope.
        Ok(self
            .new()
            .instantiate_blob_dirty(
                self.get_new_player_blob()
                    .ok_or("Failed to obtain the new player entity blob.")?,
                &self.instantiation_scope(),
            )?
            .upsert_new_player_controller(identity))
    }
}
