use crate::{
    account::{account_of, AccountId},
    asset::{gear::gear_blobs, ReducerContextExtension},
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
        let player_entity_id = player.entity_id();
        self.find(player_entity_id).upsert_new_party(0);
        // The authored starting-gear MANIFEST (gear-blob ids) becomes OWNED item
        // entities located in the player: customization equips concrete entities,
        // so the worn reality needs real items behind it. Each gear blob already
        // carries its item kind, its Equippable grant, and its own appearance, so
        // instantiating it yields a complete item entity through the same pipeline
        // as any other blob. Their ids form the canonical EquipmentComponent.
        if let Some(manifest) = self.find(player_entity_id).starting_gear() {
            let scope = self.instantiation_scope();
            let mut gear_blob_ids: Vec<u32> = manifest.armament_ids.clone();
            if let Some(armor_id) = manifest.worn_armor_id {
                gear_blob_ids.push(armor_id);
            }
            gear_blob_ids.extend(manifest.worn_relic_ids.iter().copied());
            let mut equipped_entity_ids: Vec<u64> = Vec::new();
            for id in gear_blob_ids {
                if let Some(gear) = self.db.gear_blobs().id().find(id) {
                    let item = self
                        .new()
                        .instantiate_blob(gear.blob, &scope)?
                        .upsert_new_location(player_entity_id, LocationKind::Interior)
                        .into_handle();
                    equipped_entity_ids.push(item.entity_id());
                }
            }
            // The manifest is consumed once: real items now stand for it.
            self.find(player_entity_id).delete_starting_gear();
            if !equipped_entity_ids.is_empty() {
                self.find(player_entity_id)
                    .upsert_new_equipment(equipped_entity_ids);
                // Real item entities back the equipment: the summed
                // EquipmentBlobbed (the NPC-light path) would double-count,
                // so it is dropped. Real gear wins over the blob.
                self.find(player_entity_id).delete_equipment_blobbed();
            }
        }
        Ok(player)
    }
}
