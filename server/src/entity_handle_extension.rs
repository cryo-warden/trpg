use std::collections::HashSet;

use crate::{
    action::{action_rounds, actions, ActionEffect, ActionId, ActionType},
    asset::{
        armament::armaments, armor::armors, baseline::baselines, relic::relics,
        stance::stances, stat_block::StatBlock,
    },
    entity::*,
    item::ItemRef,
};

pub trait EntityHandleExtension {
    /// The entity's stat context WITHOUT any stance: baseline plus the
    /// trait/equipment/status caches. This is both the base the total builds
    /// on and the context stance-adoption requirements are checked against —
    /// a stance never provides the properties needed to enter itself.
    fn base_stat_block(&self) -> StatBlock;
    fn apply_stat_block(self, stat_block: StatBlock) -> Self;
    fn set_mhp(self, mhp: i16) -> Self;
    fn set_defense(self, defense: i8) -> Self;
    fn set_mep(self, mep: i16) -> Self;
    fn set_actions(self, action_ids: Vec<ActionId>) -> Self;
    fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u32>) -> Self;
    /// There is NO concept of known stances: a stance is available exactly
    /// when it is REACHABLE — the closure seeded by the entity's granted
    /// actions and every carried item's grants, over two edges (an action
    /// whose SetStance effect adopts a stance; a stance granting its own
    /// actions). Visited sets are the cycle prevention: a stance may grant
    /// an action that adopts another stance that grants one back.
    fn stance_is_reachable(&self, stance_id: u32) -> bool;
    fn allegiance_id(&self) -> Option<u64>;
    fn is_ally(&self, other_entity_id: u64) -> bool;
    /// Full restoration: hp and ep to their maxima, every status effect
    /// shed. Reviving at a checkpoint and attuning to a checkpoint object
    /// deliberately share this — they are the same blessing.
    fn restore_fully(&self);
    /// The one deliberate stance-adoption path — shared by the set_stance
    /// reducer and the SetStance action effect so their gates cannot drift.
    /// Gates: the fear gate (nerve must overcome a held fear), REACHABLE
    /// stances only, and the stance's own requirements against the
    /// stance-free base. Success sheds the momentary statuses and re-arms
    /// from the stance loadouts. Forced transitions (intimidation, dive)
    /// bypass this on purpose.
    fn try_adopt_stance(&self, stance_id: u32) -> Result<(), String>;
    /// The morale that counts against intimidation: the best rigid morale
    /// among co-located faction members, self included (courage and gear
    /// contributions are already folded in through the stat caches). Your
    /// buddies keep you brave.
    fn effective_morale(&self) -> i32;
    fn set_queued_action_state(self, action_id: ActionId, target_entity_id: u64) -> Self;
    fn shift_queued_action_state(self) -> Self;
    fn can_target_other(&self, other_entity_id: u64, action_id: ActionId) -> bool;
}

impl<'a, T: WithEntityHandle<'a> + InstantiateEntityBlob> EntityHandleExtension for T {
    fn base_stat_block(&self) -> StatBlock {
        let e = self.to_handle();
        let mut stat_block = e
            .baseline()
            .and_then(|b| e.ecs().db.baselines().id().find(b.baseline_id))
            .map_or_else(StatBlock::default, |b| b.stat_block);
        if let Some(c) = e.traits_stat_block_cache() {
            stat_block += &c.stat_block;
        }
        if let Some(c) = e.equipment_stat_block_cache() {
            stat_block += &c.stat_block;
        }
        if let Some(c) = e.status_stat_block_cache() {
            stat_block += &c.stat_block;
        }
        stat_block
    }

    fn apply_stat_block(self, stat_block: StatBlock) -> Self {
        self.to_handle()
            .clone()
            .upsert_new_total_stat_block(stat_block.clone())
            .into_handle()
            .upsert_new_attack(stat_block.attack)
            .set_mhp(stat_block.mhp)
            .set_mep(stat_block.mep)
            .set_defense(stat_block.defense)
            .set_actions(stat_block.action_ids)
            .set_appearance_feature_ids(stat_block.appearance_feature_ids);
        self
    }

    // MAXIMUM POOLS ARE A RATCHET. Creation sets them freely (a tiny body
    // is born with a tiny pool); afterwards a recomputed total can only
    // RAISE them — and a raise carries the current value up with it, so
    // gaining a maximum never fakes a damaged/spent state. Reductions are
    // refused outright: every max-pool exploit is a raise/lower CYCLE
    // (spend to zero, re-gain the max, repeat), and with the lowering half
    // impossible the cycle never closes. The stored component is itself
    // the before-value the comparison needs. The design half of the deal:
    // mhp/mep sources must be LIMITED — permanent, progression-like grants,
    // not swappable gear (each swappable source is a one-time permanent
    // boost under this rule).
    fn set_mhp(self, mhp: i16) -> Self {
        let e = self.to_handle();
        if let Some(mut hp) = e.hp() {
            if mhp > hp.mhp {
                hp.hp = hp.hp.saturating_add(mhp - hp.mhp);
                hp.mhp = mhp;
                e.update_hp_row(hp);
            }
        } else {
            e.insert_new_hp(mhp, mhp, 0, 0, 0);
        }
        self
    }

    fn set_defense(self, defense: i8) -> Self {
        let e = self.to_handle();
        if let Some(mut hp_component) = e.hp() {
            hp_component.defense = defense;
            e.update_hp_row(hp_component);
        } else {
            e.insert_new_hp(0, 0, defense, 0, 0);
        }
        self
    }

    fn set_mep(self, mep: i16) -> Self {
        let e = self.to_handle();
        if let Some(mut ep_component) = e.ep() {
            if mep > ep_component.mep {
                ep_component.ep = ep_component.ep.saturating_add(mep - ep_component.mep);
                ep_component.mep = mep;
                e.update_ep_row(ep_component);
            }
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

    fn stance_is_reachable(&self, stance_id: u32) -> bool {
        let e = self.to_handle();
        let ecs = e.ecs();

        // Seeds: the total's granted actions plus every carried item's
        // granted actions (gear reaches its stances without being wielded —
        // the loadout menu must let you configure toward them).
        let mut action_queue: Vec<ActionId> = { e.total_stat_block() }
            .map(|t| t.stat_block.action_ids)
            .unwrap_or_default();
        for carried in ecs
            .db
            .location_components()
            .location_entity_id()
            .filter(e.entity_id())
        {
            if let Some(item) = ecs.find(carried.entity_id).item() {
                let grants = match item.item_ref {
                    ItemRef::Armament(id) => {
                        ecs.db.armaments().id().find(id).map(|a| a.stat_block.action_ids)
                    }
                    ItemRef::Armor(id) => {
                        ecs.db.armors().id().find(id).map(|a| a.stat_block.action_ids)
                    }
                    ItemRef::Relic(id) => {
                        ecs.db.relics().id().find(id).map(|r| r.stat_block.action_ids)
                    }
                };
                action_queue.extend(grants.unwrap_or_default());
            }
        }

        let mut reached: HashSet<u32> = HashSet::new();
        let mut visited_actions: HashSet<ActionId> = HashSet::new();
        let mut stance_queue: Vec<u32> = Vec::new();
        loop {
            if let Some(action_id) = action_queue.pop() {
                if visited_actions.insert(action_id) {
                    for round in ecs.db.action_rounds().action_sequence().filter(action_id) {
                        for effect in &round.effects {
                            if let ActionEffect::SetStance(target) = effect {
                                stance_queue.push(*target);
                            }
                        }
                    }
                }
                continue;
            }
            match stance_queue.pop() {
                None => return false,
                Some(reached_id) => {
                    if reached.insert(reached_id) {
                        if reached_id == stance_id {
                            return true;
                        }
                        if let Some(s) = ecs.db.stances().id().find(reached_id) {
                            action_queue.extend(s.stat_block.action_ids);
                        }
                    }
                }
            }
        }
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

    fn try_adopt_stance(&self, stance_id: u32) -> Result<(), String> {
        let e = self.to_handle();
        let stance = e
            .ecs()
            .db
            .stances()
            .id()
            .find(stance_id)
            .ok_or_else(|| format!("Unknown stance id {}.", stance_id))?;
        // A fear status holds the cower until effective morale overcomes
        // the highest intimidation received.
        if let Some(fear) = e.fear_status() {
            let nerve = self.effective_morale();
            if nerve <= i32::from(fear.intimidation) {
                return Err(format!(
                    "Too shaken to change stance: morale {} does not overcome the fear {}.",
                    nerve, fear.intimidation
                ));
            }
        }
        // Only REACHABLE stances may be adopted: some action this entity
        // could have — through its grants, its gear, or another reachable
        // stance — must adopt it. No separate "known stances" state exists.
        if !self.stance_is_reachable(stance_id) {
            return Err(format!(
                "The stance \"{}\" is not reachable from this entity's actions or items.",
                stance.name
            ));
        }
        // Checked against the stance-free base: a stance never provides
        // the properties needed to enter itself.
        if !self.base_stat_block().meets(&stance.requirements) {
            return Err(format!(
                "The requirements of stance \"{}\" are not met.",
                stance.name
            ));
        }
        // A deliberate stance change sheds the momentary statuses: the fear
        // is overcome, the surge of courage spent, the brace abandoned.
        if e.fear_status().is_some() {
            e.delete_fear_status();
        }
        if e.courage_status().is_some() {
            e.delete_courage_status();
        }
        if e.braced_status().is_some() {
            e.delete_braced_status();
        }
        let handle = e.clone().upsert_new_active_stance(stance_id).into_handle();

        // A player with stance loadouts re-arms on swap: the new stance's
        // assigned armaments (or none, when unassigned) become the wielded
        // set. Entities without loadouts keep their flat equipment.
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

    fn restore_fully(&self) {
        let e = self.to_handle();
        if let Some(mut hp) = e.hp() {
            hp.hp = hp.mhp;
            hp.accumulated_damage = 0;
            hp.accumulated_healing = 0;
            e.update_hp_row(hp);
        }
        if let Some(mut ep) = e.ep() {
            ep.ep = ep.mep;
            e.update_ep_row(ep);
        }
        if e.fear_status().is_some() {
            e.delete_fear_status();
        }
        if e.courage_status().is_some() {
            e.delete_courage_status();
        }
        if e.braced_status().is_some() {
            e.delete_braced_status();
        }
    }

    fn effective_morale(&self) -> i32 {
        let e = self.to_handle();
        let morale_of = |entity_id: u64| {
            e.ecs()
                .find(entity_id)
                .total_stat_block()
                .map(|t| i32::from(t.stat_block.morale))
        };
        let own = morale_of(e.entity_id()).unwrap_or(0);
        let location = match e.location() {
            None => return own,
            Some(location) => location.location_entity_id,
        };
        e.ecs()
            .db
            .location_components()
            .location_entity_id()
            .filter(location)
            .filter(|c| e.is_ally(c.entity_id))
            .filter_map(|c| morale_of(c.entity_id))
            .fold(own, i32::max)
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
                ActionType::Equip => true, // WIP
                // An item is a valid inventory target when it is within
                // reach: sharing the room (takeable) or carried (droppable).
                // The effect itself enforces which of the two applies.
                ActionType::Inventory => {
                    o.item().is_some() && {
                        let carried = { o.location() }
                            .is_some_and(|l| l.location_entity_id == e.entity_id());
                        let co_located = match (e.location(), o.location()) {
                            (Some(mine), Some(theirs)) => {
                                mine.location_entity_id == theirs.location_entity_id
                            }
                            _ => false,
                        };
                        carried || co_located
                    }
                }
                ActionType::Move => o.path().is_some(),
                // Deliberate stance changes act on yourself alone.
                ActionType::Posture => other_entity_id == e.entity_id(),
                // A co-located checkpoint object (fortune-telling scenery).
                ActionType::Attune => {
                    o.checkpoint_object().is_some()
                        && match (e.location(), o.location()) {
                            (Some(mine), Some(theirs)) => {
                                mine.location_entity_id == theirs.location_entity_id
                            }
                            _ => false,
                        }
                }
                // Self (just hit the deck) or an item within reach to grab
                // mid-dive.
                ActionType::Dive => {
                    other_entity_id == e.entity_id()
                        || (o.item().is_some() && {
                            match (e.location(), o.location()) {
                                (Some(mine), Some(theirs)) => {
                                    mine.location_entity_id == theirs.location_entity_id
                                }
                                _ => false,
                            }
                        })
                }
            }
        } else {
            false
        }
    }
}

