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
    Move,
    Take,
    Drop,
    Equip,
    Unequip,
}

/// One round of an action, with its effects denormalized into the row: every
/// effect resolves in the same system tick, and an empty list is a wait
/// round. An action lives exactly as long as it has round rows — finishing
/// means there is no next round.
#[table(
  accessor = action_rounds,
  index(accessor = action_sequence, btree(columns = [action_id, sequence_index])),
  public
)]
#[derive(Debug, Clone)]
pub struct ActionRound {
    #[primary_key]
    pub id: u64,
    pub action_id: ActionId,
    pub sequence_index: i32,
    pub effects: Vec<ActionEffect>,
}

pub struct ActionHandle<'a> {
    ctx: &'a ReducerContext,
    action_id: ActionId,
}

impl<'a> ActionHandle<'a> {
    pub fn from_id(ctx: &'a ReducerContext, action_id: ActionId) -> Self {
        Self { ctx, action_id }
    }

    /// The given round's effects, or None when the action has no such round.
    pub fn round_effects(&self, sequence_index: i32) -> Option<Vec<ActionEffect>> {
        self.ctx
            .db
            .action_rounds()
            .action_sequence()
            .filter((self.action_id, sequence_index))
            .next()
            .map(|round| round.effects)
    }
}
