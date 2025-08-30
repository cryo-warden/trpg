secador::secador!(
    (table, emit_fn),
    [
        (early_events, emit_early),
        (middle_events, emit_middle),
        (late_events, emit_late),
    ],
    {
        use ecs::Ecs;
        use spacetimedb::{table, SpacetimeType, Table, Timestamp};

        use crate::{
            action::ActionEffect,
            entity::{hp_components, location_components, path_components},
        };

        #[derive(Debug, Clone, SpacetimeType)]
        pub enum EventType {
            StartAction(u64),
            ActionEffect(ActionEffect),
        }

        #[table(name = observable_events, public)]
        #[seca(1)]
        #[table(name = __table)]
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

        #[allow(dead_code)]
        impl EntityEvent {
            seca!(1);
            pub fn __emit_fn(
                ecs: Ecs,
                owner_entity_id: u64,
                event_type: EventType,
                target_entity_id: u64,
            ) {
                ecs.db.__table().insert(EntityEvent {
                    id: 0,
                    time: ecs.timestamp,
                    owner_entity_id,
                    event_type,
                    target_entity_id,
                });
            }

            pub fn resolve(&self, ecs: Ecs) {
                let target_entity_id = self.target_entity_id;
                log::debug!("resolve event {} of type {:?}", self.id, self.event_type);
                match self.event_type {
                    EventType::StartAction(_) => {}
                    EventType::ActionEffect(ref action_effect) => match action_effect {
                        ActionEffect::Buff(_) => {} // WIP
                        ActionEffect::Rest => {}
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
                        }
                        ActionEffect::Attack(damage) => {
                            let target_hp =
                                ecs.db.hp_components().entity_id().find(target_entity_id);
                            match target_hp {
                                None => {}
                                Some(mut target_hp) => {
                                    target_hp.accumulated_damage += damage;
                                    ecs.db.hp_components().entity_id().update(target_hp);
                                }
                            }
                        }
                        ActionEffect::Heal(heal) => {
                            let target_hp =
                                ecs.db.hp_components().entity_id().find(target_entity_id);
                            match target_hp {
                                None => {}
                                Some(mut target_hp) => {
                                    target_hp.accumulated_healing += heal;
                                    ecs.db.hp_components().entity_id().update(target_hp);
                                }
                            }
                        }
                        ActionEffect::Take => {}    // WIP
                        ActionEffect::Drop => {}    // WIP
                        ActionEffect::Equip => {}   // WIP
                        ActionEffect::Unequip => {} // WIP
                    },
                }

                let mut observable_event = self.to_owned();
                observable_event.id = 0;
                ecs.db.observable_events().insert(observable_event);
            }
        }
    }
);
