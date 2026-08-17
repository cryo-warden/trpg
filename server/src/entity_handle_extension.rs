use std::collections::HashSet;

use crate::{
    action::{action_rounds, actions, special_actions, ActionEffect, ActionId, ActionType},
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
    fn apply_stat_block(
        self,
        stat_block: StatBlock,
        available_action_ids: Vec<ActionId>,
    ) -> Self;
    fn set_mhp(self, mhp: i16) -> Self;
    fn set_defense(self, defense: i8) -> Self;
    fn set_mep(self, mep: i16) -> Self;
    fn set_actions(self, action_ids: Vec<ActionId>) -> Self;
    fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u32>) -> Self;
    /// The armaments the hands should hold RIGHT NOW: the active stance's
    /// customization override when it assigns any, else the DEFAULT set (what
    /// the equip menu built). A stance assignment overrides the default —
    /// it is never a requirement.
    fn resolved_armament_ids(&self) -> Vec<u32>;
    /// Rewrites the CANONICAL equipment (armaments in hand, worn armor,
    /// worn relics) from the configurations. Called by the paths that
    /// converge IMMEDIATELY — the Rearm effect, intentional stance
    /// changes, the equip/unequip/take acts; menu reducers never call it
    /// (the reconciliation system forces the re-arm round instead).
    /// Gated on configuration components existing: blob-equipped
    /// config-less entities keep their flat equipment untouched.
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
        if let Some(c) = e.quest_stat_block_cache() {
            stat_block += &c.stat_block;
        }
        stat_block
    }

    /// The published total keeps its FULL grants (action_ids unfiltered):
    /// clients build candidate sets from it, and filtering out valid
    /// candidates there would lie to them. The USABLE set — requirement-
    /// and same-stance-filtered — is `available_action_ids`, and lives
    /// solely in ActionsComponent.
    fn apply_stat_block(
        self,
        stat_block: StatBlock,
        available_action_ids: Vec<ActionId>,
    ) -> Self {
        self.to_handle()
            .clone()
            .upsert_new_total_stat_block(stat_block.clone())
            .into_handle()
            .upsert_new_attack(stat_block.attack)
            .set_mhp(stat_block.mhp)
            .set_mep(stat_block.mep)
            .set_defense(stat_block.defense)
            .set_actions(available_action_ids)
            .set_appearance_feature_ids(stat_block.appearance_feature_ids);
        self
    }

    // THE MAXIMA ARE A RATCHET. Creation sets mhp/mep freely (a tiny body is
    // born with tiny maxima); afterwards a recomputed total can only RAISE
    // them — and a raise carries the current value up with it, so gaining a
    // maximum never fakes a damaged/spent state. Reductions are refused
    // outright: every max-value exploit is a raise/lower CYCLE (spend to zero,
    // re-gain the max, repeat), and with the lowering half impossible the cycle
    // never closes. The stored component is itself the before-value the
    // comparison needs. The design half of the deal: mhp/mep sources must be
    // LIMITED — permanent, progression-like grants, not swappable gear (each
    // swappable source is a one-time permanent boost under this rule).
    //
    // These writers create the hp/ep rows and thereafter only raise the
    // maxima; every entity that derives a stat block gets them, its values
    // coming from its baseline and traits.
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

        // Seeds: the UNFILTERED grants — base (body + traits + gear worn)
        // plus the active stance — never the derived ActionsComponent,
        // which is requirement- and same-stance-filtered (and a tick
        // stale): the posture back into your previous stance must count as
        // reachable even while it is filtered out of your usable actions.
        // Plus every carried item's granted actions (gear reaches its
        // stances without being wielded — the customization menu must let you
        // configure toward them).
        let mut action_queue: Vec<ActionId> = {
            let mut grants = self.base_stat_block();
            if let Some(active) = e.active_stance() {
                if let Some(s) = ecs.db.stances().id().find(active.stance_id) {
                    grants += &s.stat_block;
                }
            }
            grants.action_ids
        };
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
                    // Quest items grant no actions; their worth is the bit.
                    ItemRef::QuestItem(_) => None,
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

    fn resolved_armament_ids(&self) -> Vec<u32> {
        let e = self.to_handle();
        // The override's INTENT is explicit: None falls through to the
        // default set; Some(vec![]) is deliberately bare hands.
        let override_ids = { e.active_stance() }.and_then(|active| {
            { e.stance_customizations() }.and_then(|customizations| {
                customizations
                    .assignments
                    .iter()
                    .find(|a| a.stance_id == active.stance_id)
                    .and_then(|a| a.armament_ids.clone())
            })
        });
        override_ids
            .or_else(|| e.default_armaments().map(|d| d.armament_ids))
            .unwrap_or_default()
    }

    fn apply_resolved_equipment(&self) {
        let e = self.to_handle();
        // Only CONFIGURATION carriers converge; an entity with flat
        // authored equipment and no config keeps it untouched.
        let has_configuration = e.stance_customizations().is_some()
            || e.default_armaments().is_some()
            || e.armor().is_some()
            || e.relics().is_some();
        if !has_configuration {
            return;
        }
        // PER KIND: a kind with no configuration keeps its current
        // canonical state — an entity wielding authored gear does not
        // lose it to an unrelated config (wearing a relic must not strip
        // authored hands).
        let has_armament_config =
            e.stance_customizations().is_some() || e.default_armaments().is_some();
        let armament_ids = if has_armament_config {
            self.resolved_armament_ids()
        } else {
            { e.equipment() }.map(|q| q.armament_ids).unwrap_or_default()
        };
        let worn_armor_id = e.armor().map(|a| a.armor_id);
        let worn_relic_ids = e.relics().map(|r| r.relic_ids).unwrap_or_default();
        // Preserve the staged item-entity list across convergence; the
        // entity-based path becomes authoritative in a later stage.
        let equipped_entity_ids =
            { e.equipment() }.map(|q| q.equipped_entity_ids).unwrap_or_default();
        e.clone()
            .upsert_new_equipment(armament_ids, worn_armor_id, worn_relic_ids, equipped_entity_ids);
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
            if let Some(total) = e.total_stat_block() {
                if !total.stat_block.meets(&a.requirements) {
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
                            crate::item::ItemRef::Armament(id) => { e.default_armaments() }
                                .is_some_and(|d| d.armament_ids.contains(&id)),
                            crate::item::ItemRef::Armor(id) => {
                                { e.armor() }.is_some_and(|a| a.armor_id == id)
                            }
                            crate::item::ItemRef::Relic(id) => {
                                { e.relics() }.is_some_and(|r| r.relic_ids.contains(&id))
                            }
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

