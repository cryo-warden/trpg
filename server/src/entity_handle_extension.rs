use crate::{
    action::{actions, ActionId, ActionType},
    asset::stat_block::StatBlock,
    entity::*,
};

pub trait EntityHandleExtension {
    fn apply_stat_block(self, stat_block: StatBlock) -> Self;
    fn set_mhp(self, mhp: i32) -> Self;
    fn set_defense(self, defense: i32) -> Self;
    fn set_mep(self, mep: i32) -> Self;
    fn set_actions(self, action_ids: Vec<ActionId>) -> Self;
    fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u32>) -> Self;
    fn allegiance_id(&self) -> Option<u64>;
    fn is_ally(&self, other_entity_id: u64) -> bool;
    fn set_queued_action_state(self, action_id: ActionId, target_entity_id: u64) -> Self;
    fn shift_queued_action_state(self) -> Self;
    fn can_target_other(&self, other_entity_id: u64, action_id: ActionId) -> bool;
}

impl<'a, T: WithEntityHandle<'a> + InstantiateEntityBlob> EntityHandleExtension for T {
    fn apply_stat_block(self, stat_block: StatBlock) -> Self {
        self.to_handle()
            .clone()
            .upsert_new_attack(stat_block.attack)
            .set_mhp(stat_block.mhp)
            .set_mep(stat_block.mep)
            .set_defense(stat_block.defense)
            .set_actions(stat_block.action_ids)
            .set_appearance_feature_ids(stat_block.appearance_feature_ids);
        self
    }

    fn set_mhp(self, mhp: i32) -> Self {
        let e = self.to_handle();
        if let Some(mut hp) = e.hp() {
            hp.mhp = mhp;
            e.update_hp_row(hp);
        } else {
            e.insert_new_hp(mhp, mhp, 0, 0, 0);
        }
        self
    }

    fn set_defense(self, defense: i32) -> Self {
        let e = self.to_handle();
        if let Some(mut hp_component) = e.hp() {
            hp_component.defense = defense;
            e.update_hp_row(hp_component);
        } else {
            e.insert_new_hp(0, 0, defense, 0, 0);
        }
        self
    }

    fn set_mep(self, mep: i32) -> Self {
        let e = self.to_handle();
        if let Some(mut ep_component) = e.ep() {
            ep_component.mep = mep;
            e.update_ep_row(ep_component);
        } else {
            e.insert_new_ep(mep, mep);
        }
        self
    }

    fn set_actions(self, action_ids: Vec<ActionId>) -> Self {
        let e = self.to_handle();
        if let Some(mut c) = e.actions() {
            c.action_ids = action_ids;
            e.update_actions_row(c);
        } else {
            e.insert_new_actions(action_ids);
        }
        self
    }

    fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u32>) -> Self {
        log::debug!(
            "Setting appearance feature IDs for {}: {:?}",
            self.to_handle().entity_id(),
            appearance_feature_ids
        );
        self.to_handle()
            .clone()
            .upsert_new_appearance_features(appearance_feature_ids);
        self
    }

    fn allegiance_id(&self) -> Option<u64> {
        self.to_handle()
            .allegiance()
            .map(|a| a.allegiance_entity_id)
    }

    fn is_ally(&self, other_entity_id: u64) -> bool {
        let e = self.to_handle();
        if e.entity_id() == other_entity_id {
            return true;
        }
        if let (Some(a), Some(o)) = (
            e.allegiance_id(),
            e.ecs().find(other_entity_id).allegiance_id(),
        ) {
            a == o
        } else {
            false
        }
    }

    fn set_queued_action_state(self, action_id: ActionId, target_entity_id: u64) -> Self {
        let e = self.to_handle();
        e.delete_queued_action_state();
        e.insert_queued_action_state_row(ActionStateComponent {
            entity_id: e.entity_id(),
            action_id,
            sequence_index: 0,
            target_entity_id,
        });
        self
    }

    fn shift_queued_action_state(self) -> Self {
        let e = self.to_handle();
        if let Some(queued_action_state) = e.queued_action_state() {
            e.delete_queued_action_state();
            e.insert_action_state_row(queued_action_state);
        }
        self
    }

    fn can_target_other(&self, other_entity_id: u64, action_id: ActionId) -> bool {
        let e = self.to_handle();
        if let Some(a) = e.ecs().db.actions().id().find(action_id) {
            let o = e.ecs().find(other_entity_id);
            // TODO Add same-location check as a separate function, which is also used to validate individual effects before they're resolved.
            match a.action_type {
                ActionType::Attack => o.hp().is_some() && !self.is_ally(other_entity_id),
                ActionType::Buff => o.hp().is_some() && self.is_ally(other_entity_id),
                ActionType::Equip => true,     // WIP
                ActionType::Inventory => true, // WIP
                ActionType::Move => o.path().is_some(),
            }
        } else {
            false
        }
    }
}

pub trait InstantiateEntityBlobExtension: Sized {
    fn instantiate_blob_dirty(
        self,
        blob: EntityBlob,
        scope: &InstantiationScope<'_>,
    ) -> Result<Self, String>;
}

impl<'a, T: WithEntityHandle<'a> + EntityHandleExtension + InstantiateEntityBlob>
    InstantiateEntityBlobExtension for T
{
    fn instantiate_blob_dirty(
        self,
        blob: EntityBlob,
        scope: &InstantiationScope<'_>,
    ) -> Result<Self, String> {
        let e = self.to_handle();
        e.insert_new_traits_stat_block_dirty_flag();
        e.insert_new_total_stat_block_dirty_flag();
        self.instantiate_blob(blob, scope)
    }
}
