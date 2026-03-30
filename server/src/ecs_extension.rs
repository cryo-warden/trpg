use crate::{
    asset::ReducerContextExtension, entity::*, entity_handle_extension::EntityHandleExtension,
};
use ecs::Ecs;
use spacetimedb::Identity;

pub trait EcsExtension<'a> {
    fn new_room(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_map_entity_id: u64,
    ) -> EntityHandle<'a>;
    fn new_path(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> EntityHandle<'a>;
    fn from_player_identity(
        self,
        identity: Identity,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>>;
    fn from_name(self, name: &str) -> Option<name_component::WithComponent<EntityHandle<'a>>>;
    fn new_player(
        self,
        identity: Identity,
    ) -> Result<player_controller_component::WithComponent<EntityHandle<'a>>, String>;
}

impl<'a> EcsExtension<'a> for Ecs<'a> {
    fn new_room(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_map_entity_id: u64,
    ) -> EntityHandle<'a> {
        self.new()
            .upsert_new_appearance_features(appearance_feature_indexes)
            .upsert_new_location_map(location_map_entity_id)
            .into_handle()
    }
    fn new_path(
        self,
        appearance_feature_indexes: Vec<u32>,
        location_entity_id: u64,
        destination_entity_id: u64,
    ) -> EntityHandle<'a> {
        self.new()
            .upsert_new_appearance_features(appearance_feature_indexes)
            .upsert_new_location(location_entity_id)
            .upsert_new_path(destination_entity_id)
            .into_handle()
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

    fn from_name(self, name: &str) -> Option<name_component::WithComponent<EntityHandle<'a>>> {
        self.db
            .name_components()
            .name()
            .find(name.to_string())
            .map(|n| self.into_name_handle(n))
    }

    fn new_player(
        self,
        identity: Identity,
    ) -> Result<player_controller_component::WithComponent<EntityHandle<'a>>, String> {
        // WIP Design how to handle references to other entities (like allegiances, rooms, etc) in entity blobs.
        // Reference concept: For special entities, the relationships would be hardcoded. Other relationships can simply use IDs of real entities.
        // Consider adding a SpecialEntityComponent type which simply points sepcific enum variants to specific entity IDs.
        Ok({
            self.new()
                .instantiate_blob_dirty(
                    self.get_new_player_blob()
                        .ok_or("Failed to obtain the new player entity blob.")?,
                )
                .upsert_new_allegiance(
                    // WIP NewPlayerAllegiance SpecialEntityComponent?
                    self.from_name("allegiance1")
                        .ok_or("Cannot find starting allegiance.")?
                        .entity_id(),
                )
                .upsert_new_location(
                    // WIP Must generate new entity to hold new player starting room and map.
                    // Player should not be immediately dropped into a shared instance.
                    self.from_name("room1")
                        .ok_or("Cannot find starting room.")?
                        .entity_id(),
                )
                .into_handle()
                .upsert_new_player_controller(identity)
        })
    }
}
