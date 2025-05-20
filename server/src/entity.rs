use spacetimedb::{Identity, ReducerContext, Table};

#[spacetimedb::table(name = entities, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
}

pub struct EntityBuilder<'a> {
    pub(crate) ctx: &'a ReducerContext,
    pub(crate) entity_id: u64,
}

#[allow(dead_code)]
impl<'a> EntityBuilder<'a> {
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

    pub fn add_hp(self, hp: i32) -> Self {
        self.ctx
            .db
            .hp_components()
            .insert(HPComponent::new(self.entity_id, hp));
        self
    }
}

#[spacetimedb::table(name = hp_components, public)]
#[derive(Debug, Clone)]
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

#[spacetimedb::table(name = player_controller_components, public)]
#[derive(Debug, Clone)]
pub struct PlayerControllerComponent {
    #[primary_key]
    pub entity_id: u64,
    #[unique]
    pub identity: Identity,
}

#[spacetimedb::table(name = action_state_components, public)]
#[derive(Debug, Clone)]
pub struct ActionStateComponent {
    #[primary_key]
    pub entity_id: u64,
    pub action_id: u64,
    pub sequence_index: i32,
}

#[spacetimedb::table(name = entity_targets, public)]
#[derive(Debug, Clone)]
pub struct EntityTarget {
    #[primary_key]
    pub entity_id: u64,
    pub target_entity_id: u64,
}
