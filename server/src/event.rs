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
        }

        /// The free hand of the DEFAULT configuration: the stored total
        /// with the in-hand set swapped for the default set. Equip and
        /// the take auto-wield edit the DEFAULT slot, so their grip rule
        /// evaluates the configuration they edit — never whatever stance
        /// override happens to be in hand right now.
        fn default_configuration_hand(ecs: Ecs, owner_entity_id: u64) -> i32 {
            let owner = ecs.find(owner_entity_id);
            let total = owner
                .total_stat_block()
                .map_or(0, |t| i32::from(t.stat_block.hand));
            let hand_of = |armament_id: &u32| {
                ecs.db
                    .armaments()
                    .id()
                    .find(armament_id)
                    .map_or(0, |a| i32::from(a.stat_block.hand))
            };
            let in_hand: i32 = { owner.equipment() }
                .map(|e| e.armament_ids.iter().map(hand_of).sum())
                .unwrap_or(0);
            let of_default: i32 = { owner.default_armaments() }
                .map(|d| d.armament_ids.iter().map(hand_of).sum())
                .unwrap_or(0);
            total - in_hand + of_default
        }

        /// THE take: shared verbatim by the Take effect and Dive's grab so
        /// the two can never drift. A co-located item moves into the taker
        /// (carrying IS location — pocketing needs no free hand), and an
        /// armament is additionally WIELDED when the grip allows it.
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
                    item_location.location_entity_id = taker_entity_id;
                    ecs.db.location_components().entity_id().update(item_location);
                    if let crate::item::ItemRef::Armament(armament_id) = item.item_ref {
                        let taker = ecs.find(taker_entity_id);
                        let default_hand =
                            default_configuration_hand(ecs, taker_entity_id);
                        let armament_hand = ecs
                            .db
                            .armaments()
                            .id()
                            .find(armament_id)
                            .map_or(0, |a| i32::from(a.stat_block.hand));
                        if default_hand + armament_hand >= 0 {
                            // The auto-wield goes to the DEFAULT slot; the
                            // hands re-resolve (an active stance override
                            // keeps winning).
                            let mut armament_ids = taker
                                .default_armaments()
                                .map(|c| c.armament_ids)
                                .unwrap_or_default();
                            armament_ids.push(armament_id);
                            taker.upsert_new_default_armaments(armament_ids);
                            ecs.find(taker_entity_id).apply_resolved_armaments();
                        }
                    }
                    true
                }
                _ => false,
            }
        }

        /// Equip a CARRIED item: wield an armament (grip permitting), wear
        /// armor (replacing what is worn), or add a relic (cap 4). An
        /// armament goes into the DEFAULT slot — the set the hands hold
        /// whenever the active stance assigns no override — and the hands
        /// re-resolve.
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
                crate::item::ItemRef::Armament(armament_id) => {
                    let default_hand = default_configuration_hand(ecs, owner_entity_id);
                    let armament_hand = ecs
                        .db
                        .armaments()
                        .id()
                        .find(armament_id)
                        .map_or(0, |a| i32::from(a.stat_block.hand));
                    if default_hand + armament_hand < 0 {
                        return false;
                    }
                    let mut armament_ids = owner
                        .default_armaments()
                        .map(|c| c.armament_ids)
                        .unwrap_or_default();
                    armament_ids.push(armament_id);
                    owner.upsert_new_default_armaments(armament_ids);
                    ecs.find(owner_entity_id).apply_resolved_armaments();
                    true
                }
                crate::item::ItemRef::Armor(armor_id) => {
                    owner.upsert_new_armor(armor_id);
                    true
                }
                crate::item::ItemRef::Relic(relic_id) => {
                    let mut relic_ids =
                        owner.relics().map(|c| c.relic_ids).unwrap_or_default();
                    if relic_ids.len() >= 4 {
                        return false;
                    }
                    relic_ids.push(relic_id);
                    owner.upsert_new_relics(relic_ids);
                    true
                }
                // Quest items are eaten, never worn.
                crate::item::ItemRef::QuestItem(_) => false,
            }
        }

        /// Unequip a CARRIED, currently equipped item: take the armament
        /// out of the DEFAULT slot (hands re-resolve), shed the worn
        /// armor, or remove the relic. The item stays owned.
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
                crate::item::ItemRef::Armament(armament_id) => {
                    let mut armament_ids = owner
                        .default_armaments()
                        .map(|c| c.armament_ids)
                        .unwrap_or_default();
                    let Some(position) =
                        armament_ids.iter().position(|id| *id == armament_id)
                    else {
                        return false;
                    };
                    armament_ids.remove(position);
                    owner.upsert_new_default_armaments(armament_ids);
                    ecs.find(owner_entity_id).apply_resolved_armaments();
                    true
                }
                crate::item::ItemRef::Armor(armor_id) => {
                    if { owner.armor() }.is_some_and(|c| c.armor_id == armor_id) {
                        owner.delete_armor();
                        true
                    } else {
                        false
                    }
                }
                crate::item::ItemRef::Relic(relic_id) => {
                    let mut relic_ids =
                        owner.relics().map(|c| c.relic_ids).unwrap_or_default();
                    let Some(position) =
                        relic_ids.iter().position(|id| *id == relic_id)
                    else {
                        return false;
                    };
                    relic_ids.remove(position);
                    owner.upsert_new_relics(relic_ids);
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
                                            location_component.location_entity_id =
                                                path_component.destination_entity_id;
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
                                    target_location.location_entity_id =
                                        owner_location.location_entity_id;
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
                                if *magnitude > fear.intimidation {
                                    fear.intimidation = *magnitude;
                                    victim.update_fear_status_row(fear);
                                }
                                false
                            } else if i32::from(*magnitude) > victim.effective_morale() {
                                match ecs
                                    .db
                                    .special_stances()
                                    .key()
                                    .find(SpecialStanceKey::Cowering)
                                {
                                    None => {
                                        log::error!(
                                            "Intimidation broke entity {} but no cowering stance is registered.",
                                            target_entity_id
                                        );
                                        false
                                    }
                                    Some(cowering) => {
                                        if victim.action_state().is_some() {
                                            victim.delete_action_state();
                                        }
                                        if victim.queued_action_state().is_some() {
                                            victim.delete_queued_action_state();
                                        }
                                        // FORCED entry: the stance changes
                                        // but the hands DON'T — a forced
                                        // stance's loadout applies only
                                        // when entered deliberately,
                                        // through an action (try_adopt).
                                        // Whatever was wielded stays.
                                        victim
                                            .clone()
                                            .upsert_new_active_stance(cowering.stance_id)
                                            .into_handle()
                                            .insert_new_fear_status(*magnitude);
                                        true
                                    }
                                }
                            } else {
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
                            let target = ecs.find(target_entity_id);
                            match (target.fear_status(), target.ep()) {
                                // (Effective morale below reads the stored
                                // total, courage already folded in.)
                                (Some(fear), Some(mut ep_component)) => {
                                    let deficit = i32::from(fear.intimidation) + 1
                                        - target.effective_morale();
                                    if deficit <= 0 {
                                        // Already braced; the fear just
                                        // has not been shaken off yet.
                                        false
                                    } else if i32::from(ep_component.ep) < deficit {
                                        false
                                    } else {
                                        ep_component.ep -= deficit as i16;
                                        target.update_ep_row(ep_component);
                                        let courage = target
                                            .courage_status()
                                            .map_or(0, |c| c.morale)
                                            .saturating_add(deficit as i16);
                                        target.clone().upsert_new_courage_status(courage);
                                        true
                                    }
                                }
                                _ => false,
                            }
                        }
                    },
                };

                if is_observable {
                    self.id = 0;
                    ecs.db.observable_events().insert(self);
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
