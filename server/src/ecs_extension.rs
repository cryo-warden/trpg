use crate::{
    account::{account_of, AccountId},
    asset::ReducerContextExtension,
    entity::*,
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
    fn from_player_account(
        self,
        account_id: AccountId,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>>;
    /// Resolves the identity to its account at this boundary; an unattached
    /// identity has no player.
    fn from_player_identity(
        self,
        identity: Identity,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>>;
    fn new_player(
        self,
        account_id: AccountId,
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
            .upsert_new_location(location_entity_id, crate::entity::LocationKind::Interior)
            .upsert_new_path(destination_entity_id, crate::entity::LocationKind::Interior)
            .into_handle())
    }
    fn from_player_account(
        self,
        account_id: AccountId,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>> {
        self.db
            .player_controller_components()
            .account_id()
            .find(account_id)
            .map(|p| self.into_player_controller_handle(p))
    }

    fn from_player_identity(
        self,
        identity: Identity,
    ) -> Option<player_controller_component::WithComponent<EntityHandle<'a>>> {
        account_of(self.ctx, identity).and_then(|account_id| self.from_player_account(account_id))
    }

    fn new_player(
        self,
        account_id: AccountId,
    ) -> Result<player_controller_component::WithComponent<EntityHandle<'a>>, String> {
        // The new-player blob carries its own references (e.g. the starting
        // allegiance as a Named selector), so instantiation needs nothing
        // beyond an empty scope. Dirty flags follow automatically from the
        // blob's component mutations.
        let player = self
            .new()
            .instantiate_blob(
                self.get_new_player_blob()
                    .ok_or("Failed to obtain the new player entity blob.")?,
                &self.instantiation_scope(),
            )?
            .upsert_new_player_controller(account_id);
        // party_leader starts at 0 (no live entity); party_leader_sanitation_system
        // repoints it at the player itself, so a lone player is their own leader.
        // Added on a fresh handle so new_player's return type stays unchanged.
        self.find(player.entity_id()).upsert_new_party(0);
        Ok(player)
    }
}
