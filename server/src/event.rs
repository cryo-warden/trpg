use spacetimedb::{table, ReducerContext, SpacetimeType, Timestamp};

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

impl Event {
    pub fn resolve(&self, ctx: &ReducerContext, target_entity_id: u64) {
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
