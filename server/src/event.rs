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
            asset::stance::{special_stances, SpecialStanceKey},
            entity::*,
            entity_handle_extension::EntityHandleExtension,
        };

        #[derive(Debug, Clone, SpacetimeType)]
        pub enum EventType {
            StartAction(ActionId),
            ActionEffect(ActionEffect),
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
                        // Carrying IS location: a taken item's location
                        // becomes the taker; a dropped item's location
                        // becomes the dropper's own location.
                        ActionEffect::Take => {
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
                                        == owner_location.location_entity_id =>
                                {
                                    target_location.location_entity_id = self.owner_entity_id;
                                    ecs.db
                                        .location_components()
                                        .entity_id()
                                        .update(target_location);
                                    true
                                }
                                _ => false,
                            }
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
                        ActionEffect::Equip => true,   // WIP
                        ActionEffect::Unequip => true, // WIP
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
                            if victim.morale().is_none() {
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
                                    let owner = ecs.find(self.owner_entity_id);
                                    owner
                                        .clone()
                                        .upsert_new_active_stance(prone.stance_id)
                                        .into_handle()
                                        .upsert_new_braced_status(*defense);
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
                                    if let (
                                        Some(item),
                                        Some(owner_location),
                                        Some(mut target_location),
                                    ) = (item, owner_location, target_location)
                                    {
                                        if target_location.location_entity_id
                                            == owner_location.location_entity_id
                                        {
                                            target_location.location_entity_id =
                                                self.owner_entity_id;
                                            ecs.db
                                                .location_components()
                                                .entity_id()
                                                .update(target_location);
                                            if let crate::item::ItemRef::Armament(armament_id) =
                                                item.item_ref
                                            {
                                                let mut armament_ids = owner
                                                    .equipment()
                                                    .map(|c| c.armament_ids)
                                                    .unwrap_or_default();
                                                armament_ids.push(armament_id);
                                                owner.clone().upsert_new_equipment(armament_ids);
                                            }
                                        }
                                    }
                                    true
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
