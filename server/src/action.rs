use spacetimedb::{table, ReducerContext, SpacetimeType};

use crate::asset::stat_block::StatRequirements;

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
    /// Thresholds the entity's total stat block must meet for this action to
    /// appear in its derived available actions.
    pub requirements: StatRequirements,
}

#[derive(Debug, Clone, SpacetimeType)]
pub enum Buff {
    Guard(i32),
}

// PLANNED: a damage ATTRIBUTE system — not quite the usual damage types —
// so that nature traits (skeletal, zombie, vampire, ghost, the elemental
// natures) carry mechanical flavor beyond appearance. Attributes would ride
// these effects and interact with the target's natures. See the
// player-damage-attributes user story.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ActionEffect {
    Buff(Buff),
    Attack(i16),
    Heal(i16),
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
    /// While an entity's CURRENT round is interruptible, queuing a new action
    /// cancels the active one immediately instead of waiting it out.
    pub interruptible: bool,
}

pub struct ActionHandle<'a> {
    ctx: &'a ReducerContext,
    action_id: ActionId,
}

impl<'a> ActionHandle<'a> {
    pub fn from_id(ctx: &'a ReducerContext, action_id: ActionId) -> Self {
        Self { ctx, action_id }
    }

    /// The given round, or None when the action has no such round.
    pub fn round(&self, sequence_index: i32) -> Option<ActionRound> {
        self.ctx
            .db
            .action_rounds()
            .action_sequence()
            .filter((self.action_id, sequence_index))
            .next()
    }
}
