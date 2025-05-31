use derive_builder::Builder;
use spacetimedb::{table, Identity, ReducerContext, Table};

use crate::action::{actions, ActionType};

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
            .set_allegiance(1) // WIP Compute correct allegiance via name lookup
            .add_location(3) // WIP Compute correct spawn location.
            .add_hp(10)
            .add_ep(10)
            .add_player_controller(ctx.sender)
            .add_action(1)
            .set_hotkey(1, 'b')
            .add_action(2)
            .set_hotkey(2, 'v')
            .add_action(3)
            .set_hotkey(3, 'm')
            .add_action(4)
            .set_hotkey(4, 'h');
    }
}

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

    pub fn from_player_identity(ctx: &'a ReducerContext) -> Option<Self> {
        ctx.db
            .inactive_player_controller_components()
            .identity()
            .find(ctx.sender)
            .map(|p| Self {
                ctx,
                entity_id: p.entity_id,
            })
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

    pub fn from_player_identity(ctx: &'a ReducerContext) -> Option<Self> {
        ctx.db
            .player_controller_components()
            .identity()
            .find(ctx.sender)
            .map(|p| Self {
                ctx,
                entity_id: p.entity_id,
            })
    }

    pub fn deactivate(self) -> InactiveEntityHandle<'a> {
        // TODO Delete entity from active space with a builder::delete method.
        InactiveEntityHandle::new(self.ctx)
    }

    pub fn set_target(self, target_entity_id: u64) -> Self {
        match self
            .ctx
            .db
            .target_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => {
                self.ctx.db.target_components().insert(TargetComponent {
                    entity_id: self.entity_id,
                    target_entity_id,
                });
            }
            Some(_) => {
                self.ctx
                    .db
                    .target_components()
                    .entity_id()
                    .update(TargetComponent {
                        entity_id: self.entity_id,
                        target_entity_id,
                    });
            }
        }
        self
    }

    pub fn delete_target(self) -> Self {
        self.ctx
            .db
            .target_components()
            .entity_id()
            .delete(self.entity_id);
        self
    }

    pub fn target(&self) -> Option<u64> {
        self.ctx
            .db
            .target_components()
            .entity_id()
            .find(self.entity_id)
            .map(|t| t.target_entity_id)
    }

    pub fn add_location(self, location_entity_id: u64) -> Self {
        self.ctx.db.location_components().insert(LocationComponent {
            entity_id: self.entity_id,
            location_entity_id,
        });
        self
    }

    pub fn location(&self) -> Option<u64> {
        self.ctx
            .db
            .location_components()
            .entity_id()
            .find(self.entity_id)
            .map(|l| l.location_entity_id)
    }

    pub fn add_path(self, destination_entity_id: u64) -> Self {
        self.ctx.db.path_components().insert(PathComponent {
            entity_id: self.entity_id,
            destination_entity_id,
        });
        self
    }

    pub fn has_path(&self) -> bool {
        self.ctx
            .db
            .path_components()
            .entity_id()
            .find(self.entity_id)
            .is_some()
    }

    pub fn contents(&self) -> impl Iterator<Item = u64> {
        self.ctx
            .db
            .location_components()
            .location_entity_id()
            .filter(self.entity_id)
            .map(|l| l.entity_id)
    }

    pub fn set_allegiance(self, allegiance_entity_id: u64) -> Self {
        self.ctx
            .db
            .allegiance_components()
            .insert(AllegianceComponent {
                entity_id: self.entity_id,
                allegiance_entity_id,
            });
        self
    }

    pub fn allegiance(&self) -> Option<u64> {
        self.ctx
            .db
            .allegiance_components()
            .entity_id()
            .find(self.entity_id)
            .map(|a| a.allegiance_entity_id)
    }

    pub fn is_ally(&self, other_entity_id: u64) -> bool {
        if self.entity_id == other_entity_id {
            return true;
        }

        match self.allegiance() {
            None => false,
            Some(a) => match EntityHandle::from_id(self.ctx, other_entity_id).allegiance() {
                None => false,
                Some(o) => a == o,
            },
        }
    }

    pub fn add_action(self, action_id: u64) -> Self {
        self.ctx.db.action_components().insert(ActionComponent {
            entity_id: self.entity_id,
            action_id,
        });
        self
    }

    pub fn actions(&self) -> impl Iterator<Item = u64> {
        self.ctx
            .db
            .action_components()
            .entity_id()
            .filter(self.entity_id)
            .map(|a| a.action_id)
    }

    pub fn add_hp(self, hp: i32) -> Self {
        self.ctx
            .db
            .hp_components()
            .insert(HpComponent::new(self.entity_id, hp));
        self
    }

    pub fn has_hp(&self) -> bool {
        self.ctx
            .db
            .hp_components()
            .entity_id()
            .find(self.entity_id)
            .is_some()
    }

    pub fn add_ep(self, ep: i32) -> Self {
        self.ctx.db.ep_components().insert(EpComponent {
            entity_id: self.entity_id,
            mep: ep,
            ep,
        });
        self
    }

    pub fn set_queued_action_state(self, action_id: u64) -> Self {
        let queued_action_state = self
            .ctx
            .db
            .queued_action_state_components()
            .entity_id()
            .find(self.entity_id);
        if let Some(queued_action_state) = queued_action_state {
            self.ctx
                .db
                .queued_action_state_component_targets()
                .action_state_component_id()
                .delete(queued_action_state.id);
            self.ctx
                .db
                .queued_action_state_components()
                .id()
                .delete(queued_action_state.id);
        }
        self.ctx
            .db
            .queued_action_state_components()
            .insert(ActionStateComponent {
                action_id,
                entity_id: self.entity_id,
                id: 0,
                sequence_index: 0,
            });
        self
    }
    pub fn add_queued_action_state_target(self, target_entity_id: u64) -> Self {
        match self
            .ctx
            .db
            .queued_action_state_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => {}
            Some(action_state) => {
                self.ctx.db.queued_action_state_component_targets().insert(
                    ActionStateComponentTarget {
                        action_state_component_id: action_state.id,
                        target_entity_id,
                    },
                );
            }
        }
        self
    }

    pub fn shift_queued_action_state(self) -> Self {
        match self
            .ctx
            .db
            .queued_action_state_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => self,
            Some(queued_action_state) => {
                self.ctx
                    .db
                    .queued_action_state_components()
                    .id()
                    .delete(queued_action_state.id);
                let target_entity_ids = self
                    .ctx
                    .db
                    .queued_action_state_component_targets()
                    .action_state_component_id()
                    .filter(queued_action_state.id)
                    .map(|t| t.target_entity_id);
                let mut s = self.add_action_state(queued_action_state.action_id);
                for target_entity_id in target_entity_ids {
                    s = s.add_action_state_target(target_entity_id);
                }
                s
            }
        }
    }

    pub fn action_state_component(&self) -> Option<ActionStateComponent> {
        self.ctx
            .db
            .action_state_components()
            .entity_id()
            .find(self.entity_id)
    }

    fn add_action_state(self, action_id: u64) -> Self {
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
    fn add_action_state_target(self, target_entity_id: u64) -> Self {
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

    pub fn set_hotkey(self, action_id: u64, character: char) -> Self {
        let character_code = character as u32;
        self.ctx
            .db
            .action_hotkey_components()
            .entity_id_and_action_id()
            .delete((self.entity_id, action_id));
        self.ctx
            .db
            .action_hotkey_components()
            .entity_id_and_character_code()
            .delete((self.entity_id, character_code));
        self.ctx
            .db
            .action_hotkey_components()
            .insert(ActionHotkeyComponent {
                entity_id: self.entity_id,
                action_id,
                character_code,
            });
        self
    }

    pub fn can_target_other(&self, other_entity_id: u64, action_id: u64) -> bool {
        let o = EntityHandle::from_id(self.ctx, other_entity_id);
        match self.ctx.db.actions().id().find(action_id) {
            None => false,
            Some(a) => match a.action_type {
                ActionType::Attack => o.has_hp() && !self.is_ally(other_entity_id),
                ActionType::Buff => o.has_hp() && self.is_ally(other_entity_id),
                ActionType::Equip => true,     // WIP
                ActionType::Inventory => true, // WIP
                ActionType::Move => o.has_path(),
            },
        }
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

#[table(name = path_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct PathComponent {
    #[primary_key]
    pub entity_id: u64,
    #[index(btree)]
    pub destination_entity_id: u64,
}

#[table(name = allegiance_components, public)]
#[derive(Debug, Clone)]
pub struct AllegianceComponent {
    #[primary_key]
    pub entity_id: u64,
    #[index(btree)]
    pub allegiance_entity_id: u64,
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

#[table(name = target_components, public)]
#[derive(Debug, Clone)]
pub struct TargetComponent {
    #[primary_key]
    pub entity_id: u64,
    pub target_entity_id: u64,
}

#[table(name = queued_action_state_components, public)]
#[table(name = action_state_components, public)]
#[derive(Debug, Clone, Builder)]
pub struct ActionStateComponent {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[unique]
    pub entity_id: u64,
    pub action_id: u64,
    pub sequence_index: i32,
}

#[table(name = queued_action_state_component_targets, public)]
#[table(name = action_state_component_targets, public)]
#[derive(Debug, Clone)]
pub struct ActionStateComponentTarget {
    #[index(btree)]
    pub action_state_component_id: u64,
    pub target_entity_id: u64,
}

#[table(name = action_components, public)]
#[derive(Debug, Clone)]
pub struct ActionComponent {
    #[index(btree)]
    pub entity_id: u64,
    pub action_id: u64,
}

#[table(
  name = action_hotkey_components,
  public,
  index(name=entity_id_and_action_id, btree(columns=[entity_id, action_id])),
  index(name=entity_id_and_character_code, btree(columns=[entity_id, character_code]))
)]
#[derive(Debug, Clone)]
pub struct ActionHotkeyComponent {
    #[index(btree)]
    pub entity_id: u64,
    pub action_id: u64,
    pub character_code: u32,
}

#[table(name = action_option_components, public)]
#[derive(Debug, Clone)]
pub struct ActionOptionComponent {
    #[index(btree)]
    pub entity_id: u64,
    pub action_id: u64,
    pub target_entity_id: u64,
}
