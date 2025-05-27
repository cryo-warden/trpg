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

pub struct EntityHandle<'a> {
    pub ctx: &'a ReducerContext,
    pub is_active: bool,
    pub entity_id: u64,
}

#[allow(dead_code)]
impl<'a> EntityHandle<'a> {
    pub fn new(ctx: &'a ReducerContext) -> Self {
        let entity = ctx.db.entities().insert(Entity { id: 0 });
        Self {
            ctx,
            is_active: true,
            entity_id: entity.id,
        }
    }

    pub fn new_inactive(ctx: &'a ReducerContext) -> Self {
        let entity = ctx.db.inactive_entities().insert(Entity { id: 0 });
        Self {
            ctx,
            is_active: false,
            entity_id: entity.id,
        }
    }

    pub fn from_id(ctx: &'a ReducerContext, entity_id: u64) -> Self {
        Self {
            ctx,
            is_active: true,
            entity_id,
        }
    }

    pub fn deactivate(mut self) -> Self {
        if !self.is_active {
            return self;
        }

        self.is_active = false;
        // TODO self.entity_id = id of the new inactive entity.
        // TODO Delete entity from active space with a builder::delete method.
        self
    }

    pub fn add_hp(self, hp: i32) -> Self {
        let hp_component = HPComponent::new(self.entity_id, hp);
        if self.is_active {
            self.ctx.db.hp_components().insert(hp_component);
        } else {
            self.ctx.db.inactive_hp_components().insert(hp_component);
        }
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
            Some(action_state) => {
                self.ctx
                    .db
                    .action_state_component_targets()
                    .insert(ActionStateComponentTarget {
                        action_state_component_id: action_state.id,
                        target_entity_id,
                    });
            }
            _ => {}
        }
        self
    }
}

#[table(name = inactive_hp_components, public)]
#[table(name = hp_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct HPComponent {
    #[primary_key]
    pub entity_id: u64,
    pub hp: i32,
    pub mhp: i32,
    pub defense: i32,
    pub accumulated_damage: i32,
    pub accumulated_healing: i32,
}

#[allow(dead_code)]
impl HPComponent {
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
