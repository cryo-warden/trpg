use spacetimedb::{table, ReducerContext, SpacetimeType, Table, Timestamp};

use crate::{
    action::ActionEffect,
    component::{HpComponentEntity, LocationComponentEntity, PathComponentEntity},
    entity::{ActorArchetype, EntityId, PathArchetype, WithEntityId},
};

#[derive(Debug, Clone, SpacetimeType)]
pub enum EventType {
    StartAction(u64),
    ActionEffect(ActionEffect),
}

#[table(name = observable_events, public)]
#[table(name = early_events)]
#[table(name = middle_events)]
#[table(name = late_events)]
#[derive(Debug, Clone)]
pub struct EntityEvent {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub time: Timestamp,
    pub owner_entity_id: EntityId,
    pub event_type: EventType,
    pub target_entity_id: EntityId,
}

#[allow(dead_code)]
impl EntityEvent {
    pub fn emit_early(
        ctx: &ReducerContext,
        owner_entity_id: EntityId,
        event_type: EventType,
        target_entity_id: EntityId,
    ) {
        ctx.db.early_events().insert(EntityEvent {
            id: 0,
            time: ctx.timestamp,
            owner_entity_id,
            event_type,
            target_entity_id,
        });
    }

    pub fn emit_middle(
        ctx: &ReducerContext,
        owner_entity_id: EntityId,
        event_type: EventType,
        target_entity_id: EntityId,
    ) {
        ctx.db.middle_events().insert(EntityEvent {
            id: 0,
            time: ctx.timestamp,
            owner_entity_id,
            event_type,
            target_entity_id,
        });
    }

    pub fn emit_late(
        ctx: &ReducerContext,
        owner_entity_id: EntityId,
        event_type: EventType,
        target_entity_id: EntityId,
    ) {
        ctx.db.late_events().insert(EntityEvent {
            id: 0,
            time: ctx.timestamp,
            owner_entity_id,
            event_type,
            target_entity_id,
        });
    }

    // WIP For each effect, create a separate method with a generic trait bound. Route to the proper version using an enum.
    pub fn resolve(&self, ctx: &ReducerContext) {
        let target_entity_id = self.target_entity_id;
        log::debug!("resolve event {} of type {:?}", self.id, self.event_type);
        match self.event_type {
            EventType::StartAction(_) => {}
            EventType::ActionEffect(ref action_effect) => match action_effect {
                ActionEffect::Buff(_) => {} // WIP
                ActionEffect::Rest => {}
                ActionEffect::Move => {
                    if let (Some(p), Some(mut a)) = (
                        PathArchetype::from_entity_id(ctx, target_entity_id),
                        ActorArchetype::from_entity_id(ctx, self.owner_entity_id),
                    ) {
                        let l = a.mut_location();
                        l.location_entity_id = p.path().destination_entity_id;
                        a.update(ctx);
                    }
                }
                ActionEffect::Attack(damage) => {
                    if let Some(mut t) = ActorArchetype::from_entity_id(ctx, target_entity_id) {
                        let hp = t.mut_hp();
                        hp.accumulated_damage += damage;
                        t.update(ctx);
                    }
                }
                ActionEffect::Heal(heal) => {
                    if let Some(mut t) = ActorArchetype::from_entity_id(ctx, target_entity_id) {
                        let hp = t.mut_hp();
                        hp.accumulated_healing += heal;
                        t.update(ctx);
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
        ctx.db.observable_events().insert(observable_event);
    }
}
