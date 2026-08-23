use std::collections::HashSet;

use spacetimedb::Table;

use crate::{
    action::{action_rounds, actions, special_actions, ActionEffect, ActionId, ActionType},
    asset::{baseline::baselines, stance::stances},
    entity::*,
    item::ItemRef,
    stat_group::{BodyCapacityBlock, ReadinessBlock},
};

pub trait EntityHandleExtension {
    /// The entity's READINESS context WITHOUT any stance: baseline plus the
    /// trait/equipment/status readiness caches. This is the context stance-
    /// adoption requirements are checked against — a stance never provides the
    /// readiness needed to enter itself.
    fn base_readiness(&self) -> ReadinessBlock;
    /// The STEADY capacity base an equip is gated against: the stance-free
    /// body-capacity minus the two mutable rungs (equipment and status), i.e.
    /// baseline plus traits plus quest, and the given stance's own capacity when
    /// a per-stance override is being checked. Over-equipping may only outrun a
    /// transient STATUS penalty; it must fit every steadier source, so status
    /// and equipment are both excluded here. (Status never touches capacity
    /// anyway; the exclusion is kept explicit.)
    fn steady_capacity_base(&self, stance_body_capacity: Option<&BodyCapacityBlock>)
        -> BodyCapacityBlock;
    /// The first configured item ENTITY that would NOT fit when its Equippable
    /// body-capacity is folded onto `base` in order (apply-if-fits, no drop
    /// tolerated). None means the whole set is fully applicable against the
    /// steady base — the invariant every equip mutator preserves.
    fn first_overflowing_equipment(
        &self,
        base: BodyCapacityBlock,
        item_entity_ids: &[u64],
    ) -> Option<u64>;
    /// The armament ITEM ENTITIES the hands should hold RIGHT NOW: the active
    /// stance's customization override when it assigns any, else the DEFAULT
    /// set (what the equip menu built). A stance assignment overrides the
    /// default — it is never a requirement.
    fn resolved_armament_entity_ids(&self) -> Vec<u64>;
    /// The full set of item ENTITIES this entity's configurations say it
    /// should have equipped: the resolved armaments plus the worn armor and
    /// relics. None when the entity carries NO configuration at all (a
    /// blob-equipped, config-less entity is never a divergence). Shared by
    /// apply_resolved_equipment and the reconciliation system so hands and
    /// intent can never disagree about what "converged" means.
    fn intended_equipped_entity_ids(&self) -> Option<Vec<u64>>;
    /// Rewrites the CANONICAL equipment (the equipped item entities) from the
    /// configurations. Called by the paths that converge IMMEDIATELY — the
    /// Rearm effect, intentional stance changes, the equip/unequip/take acts;
    /// menu reducers never call it (the reconciliation system forces the
    /// re-arm round instead). No-op for config-less entities.
    fn apply_resolved_equipment(&self);
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
    /// from the stance customizations. Forced transitions (intimidation, dive)
    /// bypass this on purpose.
    fn try_adopt_stance(&self, stance_id: u32) -> Result<(), String>;
    /// The morale that counts against intimidation: the best rigid morale
    /// among co-located faction members, self included (courage and gear
    /// contributions are already folded in through the stat caches). Your
    /// buddies keep you brave.
    fn effective_morale(&self) -> i32;
    /// Queue a MANUAL action: replaces any existing manual entry, never
    /// the automatic ones ahead of it (one manual at a time).
    fn enqueue_manual_action(self, action_id: ActionId, target_entity_id: u64) -> Self;
    /// Queue a SYSTEM-forced action at the FRONT, exempt from the manual
    /// cap; deduplicated by action id.
    fn enqueue_automatic_action(self, action_id: ActionId, target_entity_id: u64) -> Self;
    /// Pop the queue's front into the active action state.
    fn shift_queued_action_state(self) -> Self;
    fn can_target_other(&self, other_entity_id: u64, action_id: ActionId) -> bool;
    /// A path is open when nothing blocks it, or its blocker has been
    /// smashed (no hp row left). Non-path entities are trivially open.
    fn path_is_open(&self) -> bool;
}

impl<'a, T: WithEntityHandle<'a> + InstantiateEntityBlob> EntityHandleExtension for T {
    fn base_readiness(&self) -> ReadinessBlock {
        let e = self.to_handle();
        let mut readiness = e
            .baseline()
            .and_then(|b| e.ecs().db.baselines().id().find(b.baseline_id))
            .map(|b| b.readiness)
            .unwrap_or_default();
        if let Some(c) = e.traits_readiness_cache() {
            readiness += &c.readiness;
        }
        if let Some(c) = e.equipment_readiness_cache() {
            readiness += &c.readiness;
        }
        if let Some(c) = e.status_readiness_cache() {
            readiness += &c.readiness;
        }
        if let Some(c) = e.quest_readiness_cache() {
            readiness += &c.readiness;
        }
        readiness
    }

    fn steady_capacity_base(
        &self,
        stance_body_capacity: Option<&BodyCapacityBlock>,
    ) -> BodyCapacityBlock {
        let e = self.to_handle();
        let mut base = e
            .baseline()
            .and_then(|b| e.ecs().db.baselines().id().find(b.baseline_id))
            .map(|b| b.body_capacity)
            .unwrap_or_default();
        if let Some(c) = e.traits_body_capacity_cache() {
            base += &c.body_capacity;
        }
        if let Some(c) = e.quest_body_capacity_cache() {
            base += &c.body_capacity;
        }
        if let Some(s) = stance_body_capacity {
            base += s;
        }
        base
    }

    fn first_overflowing_equipment(
        &self,
        base: BodyCapacityBlock,
        item_entity_ids: &[u64],
    ) -> Option<u64> {
        let ecs = self.to_handle().ecs();
        let mut running = base;
        for id in item_entity_ids {
            if let Some(q) = ecs.find(*id).equippable() {
                if !running.admits_equipment_item(&q.body_capacity) {
                    return Some(*id);
                }
                running += &q.body_capacity;
            }
        }
        None
    }

    fn stance_is_reachable(&self, stance_id: u32) -> bool {
        let e = self.to_handle();
        let ecs = e.ecs();

        // The readiness context reachability is measured against, WITHOUT any
        // stance: base readiness plus the readiness of every item that could
        // potentially be equipped (each carried equippable), so gear reaches
        // its stances without being wielded — the customization menu must let
        // you configure toward them. Actions are no longer explicit grants: an
        // action is traversable exactly where this readiness (plus the stance
        // currently occupied along the path) meets its requirements.
        let mut context_base = self.base_readiness();
        for carried in ecs
            .db
            .location_components()
            .location_entity_id()
            .filter(e.entity_id())
        {
            if let Some(q) = ecs.find(carried.entity_id).equippable() {
                context_base += &q.readiness;
            }
        }

        let stance_readiness = |sid: u32| {
            ecs.db.stances().id().find(sid).map(|s| s.readiness).unwrap_or_default()
        };

        // A closure over STANCES: from the posture currently occupied, any
        // action whose requirements the context (base + that stance's tags)
        // meets can fire, and its SetStance effects reach further stances —
        // which in turn unlock more actions. So a stance may be reachable ONLY
        // by first passing through another (a fully supported chain). The start
        // node is the active stance (its tags), or no stance at all.
        let mut visited: HashSet<u32> = HashSet::new();
        let mut frontier: Vec<Option<u32>> =
            vec![{ e.active_stance() }.map(|active| active.stance_id)];
        while let Some(node) = frontier.pop() {
            let mut context = context_base.clone();
            if let Some(sid) = node {
                context += &stance_readiness(sid);
            }
            for action in ecs.db.actions().iter() {
                if !context.meets(&action.requirements) {
                    continue;
                }
                for round in ecs.db.action_rounds().action_sequence().filter(action.id) {
                    for effect in &round.effects {
                        if let &ActionEffect::SetStance(target) = effect {
                            if target == stance_id {
                                return true;
                            }
                            if visited.insert(target) {
                                frontier.push(Some(target));
                            }
                        }
                    }
                }
            }
        }
        false
    }

    fn resolved_armament_entity_ids(&self) -> Vec<u64> {
        let e = self.to_handle();
        // The override's INTENT is explicit: None falls through to the
        // default set; Some(vec![]) is deliberately bare hands.
        let override_ids = { e.active_stance() }.and_then(|active| {
            { e.stance_customizations() }.and_then(|customizations| {
                customizations
                    .assignments
                    .iter()
                    .find(|a| a.stance_id == active.stance_id)
                    .and_then(|a| a.armament_entity_ids.clone())
            })
        });
        override_ids
            .or_else(|| e.default_armaments().map(|d| d.armament_entity_ids))
            .unwrap_or_default()
    }

    fn intended_equipped_entity_ids(&self) -> Option<Vec<u64>> {
        let e = self.to_handle();
        // Only CONFIGURATION carriers converge; an entity with flat authored
        // equipment and no config is never a divergence.
        let has_configuration = e.stance_customizations().is_some()
            || e.default_armaments().is_some()
            || e.armor().is_some()
            || e.relics().is_some();
        if !has_configuration {
            return None;
        }
        let ecs = e.ecs();
        let is_armament = |id: u64| {
            matches!(
                ecs.find(id).item().map(|i| i.item_ref),
                Some(ItemRef::Armament)
            )
        };
        // ARMAMENTS: the resolved override-or-default set when this entity
        // configures armaments; otherwise the armament-kind items already
        // equipped are preserved (wearing a relic must not strip authored
        // hands).
        let has_armament_config =
            e.stance_customizations().is_some() || e.default_armaments().is_some();
        let mut equipped: Vec<u64> = if has_armament_config {
            self.resolved_armament_entity_ids()
        } else {
            { e.equipment() }
                .map(|q| {
                    q.equipped_entity_ids
                        .into_iter()
                        .filter(|id| is_armament(*id))
                        .collect()
                })
                .unwrap_or_default()
        };
        // ARMOR + RELICS: the non-armament worn items, straight from their
        // configs (frozen across stances).
        if let Some(armor) = e.armor() {
            equipped.push(armor.armor_entity_id);
        }
        if let Some(relics) = e.relics() {
            equipped.extend(relics.relic_entity_ids);
        }
        Some(equipped)
    }

    fn apply_resolved_equipment(&self) {
        let e = self.to_handle();
        if let Some(equipped_entity_ids) = self.intended_equipped_entity_ids() {
            e.clone().upsert_new_equipment(equipped_entity_ids);
        }
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
        // Only REACHABLE stances may be adopted: some action this entity
        // could have — through its grants, its gear, or another reachable
        // stance — must adopt it. No separate "known stances" state exists.
        if !self.stance_is_reachable(stance_id) {
            return Err(format!(
                "The stance \"{}\" is not reachable from this entity's actions or items.",
                stance.name
            ));
        }
        // Checked against the stance-free readiness: a stance never provides
        // the readiness needed to enter itself.
        if !self.base_readiness().meets(&stance.requirements) {
            return Err(format!(
                "The requirements of stance \"{}\" are not met.",
                stance.name
            ));
        }
        // A deliberate stance change abandons the brace (dive's momentary
        // defense). Courage and fear are TIMED statuses — they count down on
        // their own (status_duration_system) and a posture change neither
        // sheds nor sidesteps them.
        if e.braced_status().is_some() {
            e.delete_braced_status();
        }
        let handle = e.clone().upsert_new_active_stance(stance_id).into_handle();

        // An INTENTIONAL stance change re-arms immediately — the change
        // already paid its round, so the reconciliation system will find
        // no mismatch and skip. It also clears the forced-stance flag: a
        // deliberate posture ends the forced one's no-re-arm carve-out.
        if handle.stance_forced().is_some() {
            handle.delete_stance_forced();
        }
        self.apply_resolved_equipment();
        // The bar: a bar assignment (Some, even empty) pins, else the
        // DEFAULT action bar pins when one is configured; entities with
        // neither keep their bar.
        let stance_bar = { handle.stance_customizations() }.and_then(|customizations| {
            customizations
                .assignments
                .iter()
                .find(|a| a.stance_id == stance_id)
                .and_then(|a| a.action_ids.clone())
        });
        let default_bar = { handle.default_actions() }.map(|d| d.action_ids);
        if let Some(action_ids) = stance_bar.or(default_bar) {
            handle.upsert_new_pinned_actions(action_ids);
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
                .readiness_total()
                .map(|t| i32::from(t.readiness.morale))
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

    fn enqueue_manual_action(self, action_id: ActionId, target_entity_id: u64) -> Self {
        let e = self.to_handle();
        // At most ONE manual entry: a new manual enqueue replaces it,
        // never the automatic entries ahead of it.
        let mut entries: Vec<crate::action::QueuedAction> = { e.action_queue() }
            .map(|q| q.entries)
            .unwrap_or_default()
            .into_iter()
            .filter(|entry| entry.automatic)
            .collect();
        entries.push(crate::action::QueuedAction {
            action_id,
            target_entity_id,
            automatic: false,
        });
        e.clone().upsert_new_action_queue(entries);
        self
    }

    fn enqueue_automatic_action(self, action_id: ActionId, target_entity_id: u64) -> Self {
        let e = self.to_handle();
        let mut entries: Vec<crate::action::QueuedAction> =
            { e.action_queue() }.map(|q| q.entries).unwrap_or_default();
        // One matching automatic suffices; the front is where forced
        // actions cut in.
        if !entries
            .iter()
            .any(|entry| entry.automatic && entry.action_id == action_id)
        {
            entries.insert(
                0,
                crate::action::QueuedAction {
                    action_id,
                    target_entity_id,
                    automatic: true,
                },
            );
            e.clone().upsert_new_action_queue(entries);
        }
        self
    }

    fn shift_queued_action_state(self) -> Self {
        let e = self.to_handle();
        if let Some(queue) = e.action_queue() {
            let mut entries = queue.entries;
            if entries.is_empty() {
                e.clone().delete_action_queue();
            } else {
                let next = entries.remove(0);
                let entity_id = e.entity_id();
                if entries.is_empty() {
                    e.clone().delete_action_queue();
                } else {
                    e.clone().upsert_new_action_queue(entries);
                }
                self.to_handle().insert_action_state_row(ActionStateComponent {
                    entity_id,
                    action_id: next.action_id,
                    sequence_index: 0,
                    target_entity_id: next.target_entity_id,
                });
            }
        }
        self
    }

    fn path_is_open(&self) -> bool {
        let e = self.to_handle();
        match e.path_blocker() {
            None => true,
            Some(blocker) => e.ecs().find(blocker.blocker_entity_id).hp().is_none(),
        }
    }

    fn can_target_other(&self, other_entity_id: u64, action_id: ActionId) -> bool {
        let e = self.to_handle();
        if let Some(a) = e.ecs().db.actions().id().find(action_id) {
            // Actor-side requirements gate EVERY act — essential for the
            // offered and derived actions, which never pass through the
            // known-actions derivation that used to filter on them (a
            // small taker can be denied a huge chest by a size floor).
            // Checked only once the total has DERIVED: an entity whose
            // stats pipeline has not run yet (act can arrive before the
            // first tick) must not read as all-zero and refuse its
            // opening move.
            if let Some(total) = e.readiness_total() {
                if !total.readiness.meets(&a.requirements) {
                    return false;
                }
            }
            let o = e.ecs().find(other_entity_id);
            // TODO Add same-location check as a separate function, which is also used to validate individual effects before they're resolved.
            match a.action_type {
                ActionType::Attack => o.hp().is_some() && !self.is_ally(other_entity_id),
                ActionType::Buff => o.hp().is_some() && self.is_ally(other_entity_id),
                // Equip/unequip target CARRIED gear — an item whose ref is
                // actually wearable/wieldable, never a quest item. The
                // UNEQUIP role additionally requires the item's asset to
                // be currently CONFIGURED (in the default set, the worn
                // armor, or the relics): you can only put away what is on.
                ActionType::Equip => {
                    let carried = { o.location() }
                        .is_some_and(|l| l.location_entity_id == e.entity_id());
                    let gear_ref = { o.item() }.map(|item| item.item_ref);
                    let Some(gear_ref) = gear_ref else {
                        return false;
                    };
                    if matches!(gear_ref, crate::item::ItemRef::QuestItem(_)) {
                        return false;
                    }
                    let is_unequip_role = e
                        .ecs()
                        .db
                        .special_actions()
                        .key()
                        .find(crate::action::SpecialActionKey::Unequip)
                        .is_some_and(|s| s.action_id == action_id);
                    if !is_unequip_role {
                        return carried;
                    }
                    carried
                        && match gear_ref {
                            crate::item::ItemRef::Armament => { e.default_armaments() }
                                .is_some_and(|d| {
                                    d.armament_entity_ids.contains(&other_entity_id)
                                }),
                            crate::item::ItemRef::Armor => {
                                { e.armor() }.is_some_and(|a| a.armor_entity_id == other_entity_id)
                            }
                            crate::item::ItemRef::Relic => { e.relics() }
                                .is_some_and(|r| r.relic_entity_ids.contains(&other_entity_id)),
                            crate::item::ItemRef::QuestItem(_) => false,
                        }
                }
                // Eat targets a CARRIED consumable: quest items only.
                ActionType::Eat => {
                    { o.item() }.is_some_and(|item| {
                        matches!(item.item_ref, crate::item::ItemRef::QuestItem(_))
                    }) && { o.location() }
                        .is_some_and(|l| l.location_entity_id == e.entity_id())
                }
                // An item is a valid inventory target when it is within
                // reach: sharing the room (takeable), carried (droppable),
                // or sitting inside an OPEN container beside the actor.
                // The effect itself enforces which applies.
                ActionType::Inventory => {
                    o.item().is_some() && {
                        let carried = { o.location() }
                            .is_some_and(|l| l.location_entity_id == e.entity_id());
                        let co_located = match (e.location(), o.location()) {
                            (Some(mine), Some(theirs)) => {
                                mine.location_entity_id == theirs.location_entity_id
                                    && mine.kind == theirs.kind
                            }
                            _ => false,
                        };
                        let in_open_container_here = { o.location() }.is_some_and(|l| {
                            let container = e.ecs().find(l.location_entity_id);
                            container.open().is_some()
                                && match (e.location(), container.location()) {
                                    (Some(mine), Some(containers)) => {
                                        mine.location_entity_id
                                            == containers.location_entity_id
                                    }
                                    _ => false,
                                }
                        });
                        carried || co_located || in_open_container_here
                    }
                }
                // Movement is OFFERED BY THE PATH, like any interaction:
                // the path names which move verbs cross it (a crack
                // offers squeeze, a chasm climb_down), and no body knows
                // "move" innately. Open, co-located, and offering — all
                // three, or no crossing.
                ActionType::Move => {
                    o.path().is_some()
                        && o.path_is_open()
                        && { o.offered_actions() }
                            .is_some_and(|offered| offered.action_ids.contains(&action_id))
                        && match (e.location(), o.location()) {
                            (Some(mine), Some(theirs)) => {
                                mine.location_entity_id == theirs.location_entity_id
                                    && mine.kind == theirs.kind
                            }
                            _ => false,
                        }
                }
                // Deliberate stance changes act on yourself alone.
                ActionType::Posture => other_entity_id == e.entity_id(),
                // System-forced and self-targeted: the reconciliation
                // system queues it; a client proposing it against anything
                // but the actor is refused.
                ActionType::Rearm => other_entity_id == e.entity_id(),
                // Offered BY the target: the co-located object must list
                // this very action among its offered_actions — the actor
                // never needs to know it.
                ActionType::Interact => {
                    o.offered_actions()
                        .is_some_and(|offered| offered.action_ids.contains(&action_id))
                        && match (e.location(), o.location()) {
                            (Some(mine), Some(theirs)) => {
                                mine.location_entity_id == theirs.location_entity_id
                                    && mine.kind == theirs.kind
                            }
                            _ => false,
                        }
                }
                // A co-located checkpoint object (fortune-telling scenery).
                ActionType::Attune => {
                    o.checkpoint_object().is_some()
                        && match (e.location(), o.location()) {
                            (Some(mine), Some(theirs)) => {
                                mine.location_entity_id == theirs.location_entity_id
                                    && mine.kind == theirs.kind
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
                                    && mine.kind == theirs.kind
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

