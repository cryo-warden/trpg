secador::secador!(
    (queue_field, emit_fn),
    [
        (early_events, emit_early),
        (middle_events, emit_middle),
        (late_events, emit_late),
    ],
    {
        use ecs::Ecs;
        use spacetimedb::{table, SpacetimeType, Table, Timestamp};

        use crate::{
            action::{ActionEffect, ActionId},
            asset::armament::armaments,
            asset::armor::armors,
            asset::quest::quests,
            asset::relic::relics,
            asset::stance::{special_stances, SpecialStanceKey},
            asset::stat_block::StatBlock,
            entity::*,
            entity_handle_extension::EntityHandleExtension,
        };

        #[derive(Debug, Clone, SpacetimeType)]
        pub enum EventType {
            StartAction(ActionId),
            ActionEffect(ActionEffect),
            /// The effect resolved against an invalid or refusing target:
            /// published INSTEAD of the effect (never silently dropped),
            /// so the client can narrate the failure. Carried only by the
            /// deliberate item/interaction verbs — combat refusals (a
            /// non-breaking intimidation) stay unnarrated.
            ActionFailed(ActionEffect),
            /// A QUEUED action was dropped at its turn because its target
            /// stopped being valid (it moved, died, or vanished).
            TargetLost(ActionId),
            /// The owner fell — a creature at zero hp becoming a corpse.
            Died,
            /// The owner broke apart — a breakable at zero hp, replaced
            /// by its remains.
            Shattered,
            /// An item (the target) tumbled out of the owner — a
            /// destroyed or dumped container spilling its contents.
            Spilled,
        }

        /// THE take: shared verbatim by the Take effect and Dive's grab so
        /// the two can never drift. A co-located item moves into the taker
        /// (carrying IS location — pocketing needs no free hand), and an
        /// armament is additionally WIELDED. There is no grip gate: over-
        /// equipping simply drives the summed hand negative, and hand-gated
        /// actions drop out of the derived set on their own.
        /// FUTURE (user note): a fighter with unarmed bonuses may prefer
        /// empty hands — once "unarmed bonus" is a definable predicate, it
        /// becomes an additional no-auto-wield condition.
        fn take_item(ecs: Ecs, taker_entity_id: u64, item_entity_id: u64) -> bool {
            let item = ecs.db.item_components().entity_id().find(item_entity_id);
            let taker_location = ecs
                .db
                .location_components()
                .entity_id()
                .find(taker_entity_id);
            let item_location = ecs
                .db
                .location_components()
                .entity_id()
                .find(item_entity_id);
            // Within reach: beside the taker, or inside an OPEN container
            // standing beside the taker (contents stay takeable in place).
            let within_reach = |item_room: u64, taker_room: u64| {
                if item_room == taker_room {
                    return true;
                }
                let container = ecs.find(item_room);
                container.open().is_some()
                    && { container.location() }
                        .is_some_and(|l| l.location_entity_id == taker_room)
            };
            match (item, taker_location, item_location) {
                (Some(item), Some(taker_location), Some(mut item_location))
                    if within_reach(
                        item_location.location_entity_id,
                        taker_location.location_entity_id,
                    ) =>
                {
                    // Pocketed: the carrier's INTERIOR. The gear-location
                    // system exteriorizes it if it ends up worn.
                    item_location.location_entity_id = taker_entity_id;
                    item_location.kind = LocationKind::Interior;
                    ecs.db.location_components().entity_id().update(item_location);
                    if let crate::item::ItemRef::Armament(_) = item.item_ref {
                        // The auto-wield goes to the DEFAULT slot as this
                        // concrete item ENTITY; the hands re-resolve (an
                        // active stance override keeps winning).
                        let taker = ecs.find(taker_entity_id);
                        let mut armament_entity_ids = taker
                            .default_armaments()
                            .map(|c| c.armament_entity_ids)
                            .unwrap_or_default();
                        armament_entity_ids.push(item_entity_id);
                        taker.upsert_new_default_armaments(armament_entity_ids);
                        // An intentional act converges immediately — its own
                        // round was the cost; the reconciliation system then
                        // finds no mismatch and skips.
                        ecs.find(taker_entity_id).apply_resolved_equipment();
                    }
                    true
                }
                _ => false,
            }
        }

        /// Equip a CARRIED item ENTITY: wield an armament, wear armor
        /// (replacing what is worn), or add a relic (cap 4). An armament
        /// goes into the DEFAULT slot — the set the hands hold whenever the
        /// active stance assigns no override. No grip gate; the hands
        /// re-resolve immediately.
        fn equip_item(ecs: Ecs, owner_entity_id: u64, item_entity_id: u64) -> bool {
            let carried = ecs
                .db
                .location_components()
                .entity_id()
                .find(item_entity_id)
                .is_some_and(|l| l.location_entity_id == owner_entity_id);
            let Some(item) = ecs.db.item_components().entity_id().find(item_entity_id)
            else {
                return false;
            };
            if !carried {
                return false;
            }
            let owner = ecs.find(owner_entity_id);
            match item.item_ref {
                crate::item::ItemRef::Armament(_) => {
                    let mut armament_entity_ids = owner
                        .default_armaments()
                        .map(|c| c.armament_entity_ids)
                        .unwrap_or_default();
                    armament_entity_ids.push(item_entity_id);
                    owner.upsert_new_default_armaments(armament_entity_ids);
                    ecs.find(owner_entity_id).apply_resolved_equipment();
                    true
                }
                crate::item::ItemRef::Armor(_) => {
                    owner.upsert_new_armor(item_entity_id);
                    ecs.find(owner_entity_id).apply_resolved_equipment();
                    true
                }
                crate::item::ItemRef::Relic(_) => {
                    let mut relic_entity_ids =
                        owner.relics().map(|c| c.relic_entity_ids).unwrap_or_default();
                    if relic_entity_ids.len() >= 4 {
                        return false;
                    }
                    relic_entity_ids.push(item_entity_id);
                    owner.upsert_new_relics(relic_entity_ids);
                    ecs.find(owner_entity_id).apply_resolved_equipment();
                    true
                }
                // Quest items are eaten, never worn.
                crate::item::ItemRef::QuestItem(_) => false,
            }
        }

        /// Unequip a CARRIED, currently equipped item ENTITY: take the
        /// armament out of the DEFAULT slot (hands re-resolve), shed the
        /// worn armor, or remove the relic. The item stays owned.
        fn unequip_item(ecs: Ecs, owner_entity_id: u64, item_entity_id: u64) -> bool {
            let carried = ecs
                .db
                .location_components()
                .entity_id()
                .find(item_entity_id)
                .is_some_and(|l| l.location_entity_id == owner_entity_id);
            let Some(item) = ecs.db.item_components().entity_id().find(item_entity_id)
            else {
                return false;
            };
            if !carried {
                return false;
            }
            let owner = ecs.find(owner_entity_id);
            match item.item_ref {
                crate::item::ItemRef::Armament(_) => {
                    let mut armament_entity_ids = owner
                        .default_armaments()
                        .map(|c| c.armament_entity_ids)
                        .unwrap_or_default();
                    let Some(position) =
                        armament_entity_ids.iter().position(|id| *id == item_entity_id)
                    else {
                        return false;
                    };
                    armament_entity_ids.remove(position);
                    owner.upsert_new_default_armaments(armament_entity_ids);
                    ecs.find(owner_entity_id).apply_resolved_equipment();
                    true
                }
                crate::item::ItemRef::Armor(_) => {
                    if { owner.armor() }.is_some_and(|c| c.armor_entity_id == item_entity_id) {
                        owner.delete_armor();
                        ecs.find(owner_entity_id).apply_resolved_equipment();
                        true
                    } else {
                        false
                    }
                }
                crate::item::ItemRef::Relic(_) => {
                    let mut relic_entity_ids =
                        owner.relics().map(|c| c.relic_entity_ids).unwrap_or_default();
                    let Some(position) =
                        relic_entity_ids.iter().position(|id| *id == item_entity_id)
                    else {
                        return false;
                    };
                    relic_entity_ids.remove(position);
                    owner.upsert_new_relics(relic_entity_ids);
                    ecs.find(owner_entity_id).apply_resolved_equipment();
                    true
                }
                // Quest items are eaten, never worn.
                crate::item::ItemRef::QuestItem(_) => false,
            }
        }

        /// The stat block an item contributes when worn or wielded — or per
        /// bit when eaten: the payload stat-affecting events carry so the
        /// narration can show the numbers that moved.
        fn item_asset_stat_block(ecs: Ecs, item_entity_id: u64) -> Option<StatBlock> {
            let item = ecs.db.item_components().entity_id().find(item_entity_id)?;
            match item.item_ref {
                crate::item::ItemRef::Armament(id) => {
                    ecs.db.armaments().id().find(id).map(|a| a.stat_block)
                }
                crate::item::ItemRef::Armor(id) => {
                    ecs.db.armors().id().find(id).map(|a| a.stat_block)
                }
                crate::item::ItemRef::Relic(id) => {
                    ecs.db.relics().id().find(id).map(|r| r.stat_block)
                }
                crate::item::ItemRef::QuestItem(q) => ecs
                    .db
                    .quests()
                    .id()
                    .find(q.quest_id)
                    .map(|quest| quest.per_bit_stat_block),
            }
        }

        #[table(accessor = observable_events, public, event)]
        #[derive(Debug, Clone)]
        pub struct EntityEvent {
            #[primary_key]
            #[auto_inc]
            pub id: u64,
            pub time: Timestamp,
            pub owner_entity_id: u64,
            pub event_type: EventType,
            pub target_entity_id: u64,
            /// The stat DELTA this event applied, when it applied one (eat,
            /// equip, unequip): the narration renders its non-zero elements.
            pub stat_block: Option<StatBlock>,
        }

        impl EntityEvent {
            pub fn resolve(mut self, ecs: Ecs) {
                let target_entity_id = self.target_entity_id;
                log::debug!("resolve event {} of type {:?}", self.id, self.event_type);
                let is_observable = match self.event_type {
                    EventType::StartAction(_) => true,
                    // Pre-formed narration events pass straight through.
                    EventType::ActionFailed(_)
                    | EventType::TargetLost(_)
                    | EventType::Died
                    | EventType::Shattered
                    | EventType::Spilled => true,
                    EventType::ActionEffect(ref action_effect) => match action_effect {
                        ActionEffect::Buff(_) => true,
                        ActionEffect::Move => {
                            match ecs.db.path_components().entity_id().find(target_entity_id) {
                                None => {}
                                // A blocked path refuses passage even if the
                                // move was somehow queued before validation.
                                Some(_) if !ecs.find(target_entity_id).path_is_open() => {}
                                Some(path_component) => {
                                    match ecs
                                        .db
                                        .location_components()
                                        .entity_id()
                                        .find(self.owner_entity_id)
                                    {
                                        None => {}
                                        Some(mut location_component) => {
                                            // Arrival copies the path's
                                            // destination pair verbatim.
                                            location_component.location_entity_id =
                                                path_component.destination_entity_id;
                                            location_component.kind =
                                                path_component.destination_kind;
                                            ecs.db
                                                .location_components()
                                                .entity_id()
                                                .update(location_component);
                                        }
                                    }
                                }
                            }
                            true
                        }
                        ActionEffect::Attack(damage) => {
                            let target_hp =
                                ecs.db.hp_components().entity_id().find(target_entity_id);
                            match target_hp {
                                None => {}
                                Some(mut target_hp) => {
                                    target_hp.accumulated_damage =
                                        target_hp.accumulated_damage.saturating_add(*damage);
                                    ecs.db.hp_components().entity_id().update(target_hp);
                                }
                            }
                            true
                        }
                        ActionEffect::Heal(heal) => {
                            let target_hp =
                                ecs.db.hp_components().entity_id().find(target_entity_id);
                            match target_hp {
                                None => {}
                                Some(mut target_hp) => {
                                    target_hp.accumulated_healing =
                                        target_hp.accumulated_healing.saturating_add(*heal);
                                    ecs.db.hp_components().entity_id().update(target_hp);
                                }
                            }
                            true
                        }
                        // Carrying IS location; the shared take_item does
                        // the move and the grip-permitting auto-wield.
                        ActionEffect::Take => {
                            take_item(ecs, self.owner_entity_id, target_entity_id)
                        }
                        ActionEffect::Drop => {
                            let item = ecs
                                .db
                                .item_components()
                                .entity_id()
                                .find(target_entity_id);
                            let owner_location = ecs
                                .db
                                .location_components()
                                .entity_id()
                                .find(self.owner_entity_id);
                            let target_location = ecs
                                .db
                                .location_components()
                                .entity_id()
                                .find(target_entity_id);
                            match (item, owner_location, target_location) {
                                (Some(_), Some(owner_location), Some(mut target_location))
                                    if target_location.location_entity_id
                                        == self.owner_entity_id =>
                                {
                                    // Dropped WHERE the owner stands: the
                                    // full location pair, kind included.
                                    target_location.location_entity_id =
                                        owner_location.location_entity_id;
                                    target_location.kind = owner_location.kind;
                                    ecs.db
                                        .location_components()
                                        .entity_id()
                                        .update(target_location);
                                    true
                                }
                                _ => false,
                            }
                        }
                        // Open the container where it stands: contents
                        // revealed and takeable, intact and in place.
                        // One-way — nothing closes (yet).
                        ActionEffect::Open => {
                            let owner = ecs.find(self.owner_entity_id);
                            let target = ecs.find(target_entity_id);
                            let co_located = match (owner.location(), target.location()) {
                                (Some(mine), Some(theirs)) => {
                                    mine.location_entity_id == theirs.location_entity_id
                                        && mine.kind == theirs.kind
                                }
                                _ => false,
                            };
                            if co_located && target.open().is_none() {
                                target.upsert_new_open();
                                true
                            } else {
                                false
                            }
                        }
                        // Tip it over: contents spill onto the floor of
                        // the container's room, the container unharmed —
                        // the same spill a breakable's death uses.
                        ActionEffect::Dump => {
                            let owner = ecs.find(self.owner_entity_id);
                            let target = ecs.find(target_entity_id);
                            let co_located = match (owner.location(), target.location()) {
                                (Some(mine), Some(theirs)) => {
                                    mine.location_entity_id == theirs.location_entity_id
                                        && mine.kind == theirs.kind
                                }
                                _ => false,
                            };
                            if co_located {
                                crate::system::spill_contents(ecs, target_entity_id);
                                true
                            } else {
                                false
                            }
                        }
                        // The reconciliation system's forced round: the
                        // canonical equipment converges to configuration.
                        // Self-targeted; the ONLY equipment writer after
                        // creation besides the intentional acts.
                        ActionEffect::Rearm => {
                            ecs.find(self.owner_entity_id).apply_resolved_equipment();
                            true
                        }
                        ActionEffect::Equip => {
                            let stat_block = item_asset_stat_block(ecs, target_entity_id);
                            let done =
                                equip_item(ecs, self.owner_entity_id, target_entity_id);
                            if done {
                                self.stat_block = stat_block;
                            }
                            done
                        }
                        ActionEffect::Unequip => {
                            let stat_block = item_asset_stat_block(ecs, target_entity_id);
                            let done =
                                unequip_item(ecs, self.owner_entity_id, target_entity_id);
                            if done {
                                // The DELTA of taking it off.
                                self.stat_block = stat_block.map(|block| block.negated());
                            }
                            done
                        }
                        // Eating a CARRIED quest item sets its bit (the
                        // quest cache re-derives; mhp/mep rise through the
                        // ratchet) and destroys the item. A bit already
                        // held refuses — that cookie smelled off for a
                        // reason — and the item survives for whoever still
                        // finds it fresh.
                        ActionEffect::Eat => {
                            let carried = ecs
                                .db
                                .location_components()
                                .entity_id()
                                .find(target_entity_id)
                                .is_some_and(|l| {
                                    l.location_entity_id == self.owner_entity_id
                                });
                            let item = ecs
                                .db
                                .item_components()
                                .entity_id()
                                .find(target_entity_id);
                            match (carried, item.map(|i| i.item_ref)) {
                                (true, Some(crate::item::ItemRef::QuestItem(q))) => {
                                    if crate::quest::set_quest_bit(
                                        ecs,
                                        self.owner_entity_id,
                                        q.quest_id,
                                        q.index,
                                    ) {
                                        // Fetched before the deletion takes
                                        // the item row with it.
                                        self.stat_block =
                                            item_asset_stat_block(ecs, target_entity_id);
                                        crate::system::delete_entity_with_joins(
                                            ecs,
                                            target_entity_id,
                                        );
                                        true
                                    } else {
                                        false
                                    }
                                }
                                _ => false,
                            }
                        }
                        // Fear, resolved in the early phase so it lands
                        // before this tick's blows. Morale is RIGID; the
                        // fluid layer is the FEAR STATUS, which records the
                        // highest intimidation received and whose presence
                        // holds the cower. A magnitude beyond the best
                        // nerve among the victim's co-located faction
                        // BREAKS the victim: action canceled (flinching is
                        // not a choice, interruptible or not) and the cower
                        // stance forced. An already-broken victim only has
                        // its fear raised — no re-flinching, so it can
                        // still rally and crawl.
                        ActionEffect::Intimidate(magnitude) => {
                            let victim = ecs.find(target_entity_id);
                            // Only something that fights from a stance can
                            // be forced into one.
                            if victim.active_stance().is_none() {
                                false
                            } else if let Some(mut fear) = victim.fear_status() {
                                // Already afraid: fear keeps the MAXIMUM
                                // intensity. A stronger scare raises it and
                                // refreshes the duration; a weaker one is
                                // ignored entirely — not even a duration
                                // reset — so a broken victim keeps ticking
                                // toward recovery and can still rally.
                                if *magnitude > fear.intimidation {
                                    fear.intimidation = *magnitude;
                                    fear.duration = crate::system::FEAR_DURATION_TURNS;
                                    victim.update_fear_status_row(fear);
                                }
                                false
                            } else if i32::from(*magnitude) > victim.effective_morale() {
                                // BROKEN: the action is canceled (flinching
                                // is not a choice, interruptible or not) and
                                // the fear lands for its full duration. No
                                // stance is forced — fear alone sinks morale
                                // below the action thresholds, leaving only
                                // the morale-free rally until courage or time
                                // restores the nerve.
                                if victim.action_state().is_some() {
                                    victim.delete_action_state();
                                }
                                if victim.action_queue().is_some() {
                                    victim.delete_action_queue();
                                }
                                victim.insert_new_fear_status(
                                    *magnitude,
                                    crate::system::FEAR_DURATION_TURNS,
                                );
                                true
                            } else {
                                // Nerve held (morale, courage folded in).
                                false
                            }
                        }
                        // Hit the deck: force the actor's OWN stance to the
                        // registered prone stance (fear, if any, stays —
                        // stances remain limited), brace for bonus defense,
                        // and grab a targeted item in the same motion —
                        // wielding an armament immediately, whose morale
                        // contribution may itself overcome a fear.
                        ActionEffect::Dive(defense) => {
                            match ecs
                                .db
                                .special_stances()
                                .key()
                                .find(SpecialStanceKey::Prone)
                            {
                                None => {
                                    log::error!(
                                        "Entity {} dove but no prone stance is registered.",
                                        self.owner_entity_id
                                    );
                                    false
                                }
                                Some(prone) => {
                                    // FORCED entry (see the cowering note):
                                    // no re-arm — the dive keeps whatever
                                    // was already in hand, plus the grab.
                                    let owner = ecs.find(self.owner_entity_id);
                                    owner
                                        .clone()
                                        .upsert_new_active_stance(prone.stance_id)
                                        .into_handle()
                                        .clone()
                                        .upsert_new_stance_forced()
                                        .into_handle()
                                        .upsert_new_braced_status(*defense);
                                    // The grab IS a take — same code, same
                                    // pocket-vs-wield rule, cannot drift.
                                    take_item(ecs, self.owner_entity_id, target_entity_id);
                                    true
                                }
                            }
                        }
                        // Seal the trance: the actor's checkpoint becomes
                        // the targeted checkpoint object's room. Death
                        // later wakes them here.
                        ActionEffect::Attune => {
                            let owner = ecs.find(self.owner_entity_id);
                            let target = ecs.find(target_entity_id);
                            match (target.checkpoint_binding(), target.location()) {
                                (Some(binding), Some(object_location)) => {
                                    let co_located =
                                        { owner.location() }.is_some_and(|mine| {
                                            mine.location_entity_id
                                                == object_location.location_entity_id
                                        });
                                    if co_located {
                                        // The binding is ABSTRACT (map +
                                        // index): the destination room may
                                        // not even exist when death cashes
                                        // it in. Attuning also bestows the
                                        // same full restoration as the
                                        // revival it foreshadows.
                                        owner.clone().upsert_new_checkpoint(
                                            binding.location_map_id,
                                            binding.checkpoint_index,
                                        );
                                        owner.restore_fully();
                                        true
                                    } else {
                                        false
                                    }
                                }
                                _ => false,
                            }
                        }
                        // A deliberate stance change carried by a Posture
                        // action: same gates as the reducer, via the shared
                        // adoption path. A refused adoption (fear held,
                        // unknown, requirements) simply fizzles the round.
                        ActionEffect::SetStance(stance_id) => {
                            let owner = ecs.find(self.owner_entity_id);
                            match owner.try_adopt_stance(*stance_id) {
                                Ok(()) => true,
                                Err(reason) => {
                                    log::debug!(
                                        "Entity {} could not adopt stance {}: {}",
                                        self.owner_entity_id,
                                        stance_id,
                                        reason
                                    );
                                    false
                                }
                            }
                        }
                        // Rally spends EP DYNAMICALLY: exactly the deficit
                        // (1:1) between the fear's intimidation and current
                        // effective morale, granting a courage status just
                        // big enough to overcome the fear. No fear, or not
                        // enough effort left: nothing happens.
                        ActionEffect::Rally => {
                            // An ordinary morale buff: STACK a courage surge.
                            // The round it takes is its whole cost — no EP.
                            // Courage is both its remaining duration and its
                            // +morale, decaying a point per turn
                            // (status_duration_system). Rally does not touch
                            // fear — enough courage lifts effective morale
                            // back over the action thresholds a fear sank it
                            // under; otherwise you wait the fear out.
                            let target = ecs.find(target_entity_id);
                            let courage = target
                                .courage_status()
                                .map_or(0, |c| c.morale)
                                .saturating_add(crate::system::COURAGE_PER_RALLY);
                            target.upsert_new_courage_status(courage);
                            true
                        }
                    },
                };

                if is_observable {
                    self.id = 0;
                    ecs.db.observable_events().insert(self);
                } else if let EventType::ActionEffect(effect) = &self.event_type {
                    // A deliberate item/interaction verb that came to
                    // nothing is REPLACED by a renderable failure event,
                    // never silently dropped. Combat refusals (a
                    // non-breaking intimidation, a spent rally) stay
                    // quiet — narrating every one would be spam.
                    let narrate_failure = matches!(
                        effect,
                        ActionEffect::Take
                            | ActionEffect::Drop
                            | ActionEffect::Equip
                            | ActionEffect::Unequip
                            | ActionEffect::Eat
                            | ActionEffect::Open
                            | ActionEffect::Dump
                            | ActionEffect::Attune
                    );
                    if narrate_failure {
                        let failed = effect.clone();
                        self.event_type = EventType::ActionFailed(failed);
                        self.id = 0;
                        ecs.db.observable_events().insert(self);
                    }
                }
            }
        }

        pub trait NewEvent {
            fn new_event(
                self,
                owner_entity_id: u64,
                event_type: EventType,
                target_entity_id: u64,
            ) -> EntityEvent;
        }

        impl NewEvent for Ecs<'_> {
            fn new_event(
                self,
                owner_entity_id: u64,
                event_type: EventType,
                target_entity_id: u64,
            ) -> EntityEvent {
                EntityEvent {
                    id: 0,
                    time: self.timestamp,
                    owner_entity_id,
                    event_type,
                    target_entity_id,
                    stat_block: None,
                }
            }
        }

        pub struct EventQueue {
            __seca: __1,
            __queue_field: Vec<EntityEvent>,
        }

        impl EventQueue {
            pub fn new() -> Self {
                Self {
                    __seca: __1,
                    __queue_field: Vec::new(),
                }
            }

            seca!(1);
            pub fn __emit_fn(&mut self, event: EntityEvent) {
                self.__queue_field.push(event);
            }

            pub fn resolve(self, ecs: Ecs) {
                seca!(1);
                for event in self.__queue_field {
                    event.resolve(ecs);
                }
            }
        }
    }
);
