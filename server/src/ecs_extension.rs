use crate::{
    account::{account_of, AccountId},
    asset::{armament::armaments, armor::armors, relic::relics, ReducerContextExtension},
    entity::*,
    item::ItemRef,
    stat_group::{AppearanceBlock, BodyCapacityBlock, ReadinessBlock, StatsBlock},
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
        // The authored starting-gear MANIFEST becomes OWNED item entities
        // located in the player: customization equips concrete entities, so
        // the worn reality needs real items behind it. Each carries its
        // Equippable stamp; their ids form the canonical EquipmentComponent.
        if let Some(manifest) = self.find(player_entity_id).starting_gear() {
            // Each spawn carries the gear's Equippable GRANT (its four per-group
            // contributions) and, separately, the gear's OWN appearance features
            // (the item's look) — two distinct channels that never mix.
            struct GearSpawn {
                item_ref: ItemRef,
                stats: StatsBlock,
                appearance: AppearanceBlock,
                body_capacity: BodyCapacityBlock,
                readiness: ReadinessBlock,
                own_appearance_ids: Vec<u32>,
            }
            let mut to_spawn: Vec<GearSpawn> = Vec::new();
            for id in &manifest.armament_ids {
                if let Some(a) = self.db.armaments().id().find(id) {
                    to_spawn.push(GearSpawn {
                        item_ref: ItemRef::Armament(*id),
                        stats: a.stats,
                        appearance: a.appearance,
                        body_capacity: a.body_capacity,
                        readiness: a.readiness,
                        own_appearance_ids: a.appearance_feature_ids,
                    });
                }
            }
            if let Some(armor_id) = manifest.worn_armor_id {
                if let Some(a) = self.db.armors().id().find(armor_id) {
                    to_spawn.push(GearSpawn {
                        item_ref: ItemRef::Armor(armor_id),
                        stats: a.stats,
                        appearance: a.appearance,
                        body_capacity: a.body_capacity,
                        readiness: a.readiness,
                        own_appearance_ids: a.appearance_feature_ids,
                    });
                }
            }
            for id in &manifest.worn_relic_ids {
                if let Some(r) = self.db.relics().id().find(id) {
                    to_spawn.push(GearSpawn {
                        item_ref: ItemRef::Relic(*id),
                        stats: r.stats,
                        appearance: r.appearance,
                        body_capacity: r.body_capacity,
                        readiness: r.readiness,
                        own_appearance_ids: r.appearance_feature_ids,
                    });
                }
            }
            let mut equipped_entity_ids: Vec<u64> = Vec::new();
            for s in to_spawn {
                let item = self
                    .new()
                    .upsert_new_item(s.item_ref)
                    .upsert_new_equippable(s.stats, s.appearance, s.body_capacity, s.readiness)
                    .upsert_new_location(player_entity_id, LocationKind::Interior)
                    .into_handle();
                if !s.own_appearance_ids.is_empty() {
                    item.clone()
                        .upsert_new_appearance_features(s.own_appearance_ids);
                }
                equipped_entity_ids.push(item.entity_id());
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
