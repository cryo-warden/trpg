use std::cmp::max;

use spacetimedb::{table, ReducerContext, SpacetimeType, Table};

#[derive(Debug, Clone, SpacetimeType)]
pub enum ActionType {
    Buff,
    Attack,
    Move,
    Inventory,
    Equip,
}

#[table(name = actions, public)]
#[derive(Debug, Clone)]
pub struct Action {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    pub action_type: ActionType,
}

#[table(name = action_names, public)]
#[derive(Debug, Clone)]
pub struct ActionName {
    #[primary_key]
    pub action_id: u64,
    #[unique]
    pub name: String,
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
  name = action_steps,
  index(name = action_sequence, btree(columns = [action_id, sequence_index])),
  public
)]
#[derive(Debug, Clone)]
pub struct ActionStep {
    #[primary_key]
    #[auto_inc]
    id: u64,
    action_id: u64,
    sequence_index: i32,
    action_effect: ActionEffect,
}

pub struct ActionHandle<'a> {
    ctx: &'a ReducerContext,
    action_id: u64,
}

#[allow(dead_code)]
impl<'a> ActionHandle<'a> {
    pub fn new(ctx: &'a ReducerContext, action_type: ActionType) -> Self {
        let action = ctx.db.actions().insert(Action { id: 0, action_type });
        Self {
            ctx,
            action_id: action.id,
        }
    }

    pub fn set_name(self, name: &str) -> Self {
        self.ctx.db.action_names().insert(ActionName {
            action_id: self.action_id,
            name: name.to_string(),
        });
        self
    }

    pub fn next_sequence_index(&self) -> i32 {
        1 + self
            .ctx
            .db
            .action_steps()
            .action_sequence()
            .filter(self.action_id)
            .fold(-1, |agg, step| max(agg, step.sequence_index))
    }

    pub fn from_id(ctx: &'a ReducerContext, action_id: u64) -> Self {
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

    pub fn add_step(self, action_effect: ActionEffect) -> Self {
        self.ctx.db.action_steps().insert(ActionStep {
            id: 0,
            action_id: self.action_id,
            action_effect,
            sequence_index: self.next_sequence_index(),
        });
        self
    }

    pub fn add_rest(self) -> Self {
        self.add_step(ActionEffect::Rest)
    }

    pub fn add_move(self) -> Self {
        self.add_step(ActionEffect::Move)
    }

    pub fn add_attack(self, value: i32) -> Self {
        self.add_step(ActionEffect::Attack(value))
    }

    pub fn add_heal(self, value: i32) -> Self {
        self.add_step(ActionEffect::Heal(value))
    }
}
