use derive_builder::Builder;
use spacetimedb::{table, Identity, ReducerContext, Table};

#[table(name = inactive_entities, public)]
#[table(name = entities, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
}

impl Entity {
    pub fn new_player(ctx: &ReducerContext) {
        EntityHandle::new(ctx)
            .add_location(1) // WIP Compute correct spawn location.
            .add_hp(10)
            .add_ep(10)
            .add_player_controller(ctx.sender);
    }
}

// TODO Make a separate type for active vs inactive EntityHandle.

pub struct InactiveEntityHandle<'a> {
    pub ctx: &'a ReducerContext,
    pub entity_id: u64,
}

#[allow(dead_code)]
impl<'a> InactiveEntityHandle<'a> {
    pub fn new(ctx: &'a ReducerContext) -> Self {
        let entity = ctx.db.inactive_entities().insert(Entity { id: 0 });
        Self {
            ctx,
            entity_id: entity.id,
        }
    }

    pub fn from_id(ctx: &'a ReducerContext, entity_id: u64) -> Self {
        Self { ctx, entity_id }
    }

    pub fn activate(self) -> EntityHandle<'a> {
        // TODO Delete entity from inactive space with a builder::delete method.
        let e = EntityHandle::new(self.ctx);
        match self
            .ctx
            .db
            .inactive_hp_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => {}
            Some(mut hp) => {
                hp.entity_id = e.entity_id;
                self.ctx.db.hp_components().insert(hp);
            }
        };
        // TODO Transfer all components similar to how hp is transfered above.
        e
    }
}

pub struct EntityHandle<'a> {
    pub ctx: &'a ReducerContext,
    pub entity_id: u64,
}

#[allow(dead_code)]
impl<'a> EntityHandle<'a> {
    pub fn new(ctx: &'a ReducerContext) -> Self {
        let entity = ctx.db.entities().insert(Entity { id: 0 });
        Self {
            ctx,
            entity_id: entity.id,
        }
    }

    pub fn from_id(ctx: &'a ReducerContext, entity_id: u64) -> Self {
        Self { ctx, entity_id }
    }

    pub fn deactivate(self) -> InactiveEntityHandle<'a> {
        // TODO Delete entity from active space with a builder::delete method.
        InactiveEntityHandle::new(self.ctx)
    }

    pub fn add_location(self, location_entity_id: u64) -> Self {
        self.ctx.db.location_components().insert(LocationComponent {
            entity_id: self.entity_id,
            location_entity_id,
        });
        self
    }

    pub fn location(&self) -> u64 {
        match self
            .ctx
            .db
            .location_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => 0,
            Some(location_component) => location_component.location_entity_id,
        }
    }

    pub fn contents(&self) -> impl Iterator<Item = u64> {
        self.ctx
            .db
            .location_components()
            .location_entity_id()
            .filter(self.entity_id)
            .map(|l| l.entity_id)
    }

    pub fn add_hp(self, hp: i32) -> Self {
        self.ctx
            .db
            .hp_components()
            .insert(HpComponent::new(self.entity_id, hp));
        self
    }

    pub fn add_ep(self, ep: i32) -> Self {
        self.ctx.db.ep_components().insert(EpComponent {
            entity_id: self.entity_id,
            mep: ep,
            ep,
        });
        self
    }

    pub fn add_action_state(self, action_id: u64) -> Self {
        self.ctx
            .db
            .action_state_components()
            .insert(ActionStateComponent {
                action_id,
                entity_id: self.entity_id,
                id: 0,
                sequence_index: 0,
            });
        self
    }
    pub fn add_action_state_target(self, target_entity_id: u64) -> Self {
        let optional_action_state = self
            .ctx
            .db
            .action_state_components()
            .entity_id()
            .find(self.entity_id);
        match optional_action_state {
            None => {}
            Some(action_state) => {
                self.ctx
                    .db
                    .action_state_component_targets()
                    .insert(ActionStateComponentTarget {
                        action_state_component_id: action_state.id,
                        target_entity_id,
                    });
            }
        }
        self
    }

    pub fn add_player_controller(self, identity: Identity) -> Self {
        self.ctx
            .db
            .player_controller_components()
            .insert(PlayerControllerComponent {
                entity_id: self.entity_id,
                identity,
            });
        self
    }
}

#[table(name = location_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct LocationComponent {
    #[primary_key]
    pub entity_id: u64,
    #[index(btree)]
    pub location_entity_id: u64,
}

#[table(name = inactive_hp_components, public)]
#[table(name = hp_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct HpComponent {
    #[primary_key]
    pub entity_id: u64,
    pub hp: i32,
    pub mhp: i32,
    pub defense: i32,
    pub accumulated_damage: i32,
    pub accumulated_healing: i32,
}

#[allow(dead_code)]
impl HpComponent {
    pub fn new(entity_id: u64, mhp: i32) -> Self {
        Self {
            entity_id: entity_id,
            hp: mhp,
            mhp,
            defense: 0,
            accumulated_damage: 0,
            accumulated_healing: 0,
        }
    }

    pub fn new_with_defense(entity_id: u64, mhp: i32, defense: i32) -> Self {
        Self {
            entity_id: entity_id,
            hp: mhp,
            mhp,
            defense,
            accumulated_damage: 0,
            accumulated_healing: 0,
        }
    }
}

#[table(name = inactive_ep_components, public)]
#[table(name = ep_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct EpComponent {
    #[primary_key]
    pub entity_id: u64,
    pub ep: i32,
    pub mep: i32,
}

#[table(name = inactive_player_controller_components, public)]
#[table(name = player_controller_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct PlayerControllerComponent {
    #[primary_key]
    pub entity_id: u64,
    #[unique]
    pub identity: Identity,
}

#[table(name = action_state_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct ActionStateComponent {
    #[primary_key]
    pub id: u64,
    #[unique]
    pub entity_id: u64,
    pub action_id: u64,
    pub sequence_index: i32,
}

#[table(name = action_state_component_targets, public)]
#[derive(Debug, Clone)]
pub struct ActionStateComponentTarget {
    #[index(btree)]
    pub action_state_component_id: u64,
    pub target_entity_id: u64,
}
