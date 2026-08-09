use spacetimedb::{table, ReducerContext, SpacetimeType};

pub type ActionId = u32;

#[derive(Debug, Clone, SpacetimeType)]
pub enum ActionType {
    Buff,
    Attack,
    Move,
    Inventory,
    Equip,
}

#[table(accessor = actions, public)]
#[derive(Debug, Clone)]
pub struct Action {
    #[primary_key]
    pub id: ActionId,
    #[unique]
    pub name: String,
    pub action_type: ActionType,
}

#[derive(Debug, Clone, SpacetimeType)]
pub enum Buff {
    Guard(i32),
}

#[derive(Debug, Clone, SpacetimeType)]
pub enum ActionEffect {
    Buff(Buff),
    Attack(i32),
    Heal(i32),
    Rest,
    Move,
    Take,
    Drop,
    Equip,
    Unequip,
}

#[table(
  accessor = action_steps,
  index(accessor = action_sequence, btree(columns = [action_id, sequence_index])),
  public
)]
#[derive(Debug, Clone)]
pub struct ActionStep {
    #[primary_key]
    pub id: u64,
    pub action_id: ActionId,
    pub sequence_index: i32,
    pub action_effect: ActionEffect,
}

pub struct ActionHandle<'a> {
    ctx: &'a ReducerContext,
    action_id: ActionId,
}

impl<'a> ActionHandle<'a> {
    pub fn from_id(ctx: &'a ReducerContext, action_id: ActionId) -> Self {
        Self { ctx, action_id }
    }

    pub fn effect(&self, sequence_index: i32) -> Option<ActionEffect> {
        self.ctx
            .db
            .action_steps()
            .action_sequence()
            .filter((self.action_id, sequence_index))
            .next()
            .map(|a| a.action_effect)
    }
}
