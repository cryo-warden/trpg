use spacetimedb::{table, ReducerContext, SpacetimeType, Table, Timestamp};

use crate::{action::ActionEffect, entity::hp_components};

#[derive(Debug, Clone, SpacetimeType)]
pub enum EventType {
    StartAction,
    ActionEffect(ActionEffect),
}

#[table(name = observable_events, public)]
#[table(name = early_events, public)]
#[table(name = late_events, public)]
#[derive(Debug, Clone)]
pub struct Event {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub time: Timestamp,
    pub owner_entity_id: u64,
    pub event_type: EventType,
}

#[allow(dead_code)]
impl Event {
    pub fn emit_early(
        ctx: &ReducerContext,
        owner_entity_id: u64,
        event_type: EventType,
        target_entity_ids: impl Iterator<Item = u64>,
    ) {
        let e = ctx.db.early_events().insert(Event {
            id: 0,
            time: ctx.timestamp,
            owner_entity_id,
            event_type,
        });
        for target_entity_id in target_entity_ids {
            ctx.db.early_event_targets().insert(EventTarget {
                event_id: e.id,
                target_entity_id,
            });
        }
    }

    pub fn emit_late(
        ctx: &ReducerContext,
        owner_entity_id: u64,
        event_type: EventType,
        target_entity_ids: impl Iterator<Item = u64>,
    ) {
        let e = ctx.db.late_events().insert(Event {
            id: 0,
            time: ctx.timestamp,
            owner_entity_id,
            event_type,
        });
        for target_entity_id in target_entity_ids {
            ctx.db.late_event_targets().insert(EventTarget {
                event_id: e.id,
                target_entity_id,
            });
        }
    }

    pub fn resolve(&self, ctx: &ReducerContext, target_entity_id: u64) {
        log::debug!("resolve event {} of type {:?}", self.id, self.event_type);
        match self.event_type {
            EventType::StartAction => {}
            EventType::ActionEffect(ref action_effect) => match action_effect {
                ActionEffect::Rest => {}
                ActionEffect::Attack(damage) => {
                    let target_hp = ctx.db.hp_components().entity_id().find(target_entity_id);
                    match target_hp {
                        None => {}
                        Some(mut target_hp) => {
                            target_hp.accumulated_damage += damage;
                            ctx.db.hp_components().entity_id().update(target_hp);
                        }
                    }
                }
                ActionEffect::Heal(heal) => {
                    let target_hp = ctx.db.hp_components().entity_id().find(target_entity_id);
                    match target_hp {
                        None => {}
                        Some(mut target_hp) => {
                            target_hp.accumulated_healing += heal;
                            ctx.db.hp_components().entity_id().update(target_hp);
                        }
                    }
                }
            },
        }
    }
}

#[table(name = observable_event_targets, public)]
#[table(name = early_event_targets, public)]
#[table(name = late_event_targets, public)]
#[derive(Debug, Clone)]
pub struct EventTarget {
    #[index(btree)]
    pub event_id: u64,
    pub target_entity_id: u64,
}
