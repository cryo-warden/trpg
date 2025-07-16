use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    table, Identity, ReducerContext, SpacetimeType, Table, Timestamp,
};

// use crate::appearance::AppearanceFeatureContext;
use crate::{
    action::{actions, ActionType},
    appearance::AppearanceFeatureContext,
    stat_block::{baselines, traits, StatBlock},
};

use ecs::{entity, WithEcs};

type EntityId = u64;

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionHotkey {
    pub action_id: u64,
    pub character_code: u32,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionOption {
    pub action_id: u64,
    pub target_entity_id: EntityId,
}

#[derive(Debug, Clone, SpacetimeType)]
pub enum MapLayout {
    Path,
    Hub,
}

entity! {
  #[derive(Debug, Clone)]
  struct_attrs;

  entity Entity entity_id: EntityId tables(entities);

  component NameComponent [(name, name_components)] {
    #[unique]
    pub name: String,
  }

  component LocationComponent [(location, location_components)] {
    #[index(btree)]
    pub location_entity_id: EntityId,
  }

  component PathComponent [(path, path_components)] {
    #[index(btree)]
    pub destination_entity_id: EntityId,
  }

  component AllegianceComponent [(allegiance, allegiance_components)] {
    #[index(btree)]
    pub allegiance_entity_id: EntityId,
  }

  component BaselineComponent [(baseline, baseline_components)] {
    pub baseline_id: u64,
  }

  component TraitsComponent [(traits, traits_components)] {
    pub trait_ids: Vec<u64>,
  }

  // TODO Add StatBlock caches for equipment and status effects.
  component StatBlockCacheComponent [
    (traits_stat_block_cache, traits_stat_block_cache_components)
  ] {
    pub stat_block: StatBlock,
  }

  // TODO Equipment and Status Effects
  component FlagComponent [
    (traits_stat_block_dirty_flag, traits_stat_block_dirty_flag_components),
    (total_stat_block_dirty_flag, total_stat_block_dirty_flag_components),
  ] {}

  component AttackComponent [(attack, attack_components)] {
    pub attack: i32,
  }

  component HpComponent [(hp, hp_components)] {
    pub hp: i32,
    pub mhp: i32,
    pub defense: i32,
    pub accumulated_damage: i32,
    pub accumulated_healing: i32,
  }

  component EpComponent [(ep, ep_components)] {
    pub ep: i32,
    pub mep: i32,
  }

  component PlayerControllerComponent [(player_controller, player_controller_components)] {
    #[unique]
    pub identity: Identity,
  }

  component TargetComponent [(target, target_components)] {
    pub target_entity_id: EntityId,
  }

  component ActionStateComponent [
    (action_state, action_state_components),
    (queued_action_state, queued_action_state_components),
  ] {
    pub target_entity_id: EntityId,
    pub action_id: u64,
    pub sequence_index: i32,
  }

  component ActionsComponent [(actions, actions_components)] {
    pub action_ids: Vec<u64>,
  }

  component ActionHotkeysComponent [(action_hotkeys, action_hotkeys_components)] {
    pub action_hotkeys: Vec<ActionHotkey>,
  }

  component ActionOptionsComponent [(action_options, action_options_components)] {
    pub action_options: Vec<ActionOption>,
  }

  component EntityProminenceComponent [(entity_prominence, entity_prominence_components)] {
    pub prominence: i32,
  }

  component TimerComponent [(entity_deactivation_timer, entity_deactivation_timer_components)] {
    pub timestamp: Timestamp,
  }

  component RngSeedComponent [(rng_seed, rng_seed_components)] {
    pub rng_seed: u64,
  }

  component LocationMapComponent [(location_map, location_map_components)] {
    pub map_entity_id: EntityId,
  }

  component MapComponent [
    (realized_map, realized_map_components),
    (unrealized_map, unrealized_map_components),
  ] {
    pub map_theme_id: u64,
    pub map_layout: MapLayout,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
  }

  component AppearanceFeaturesComponent [(appearance_features, appearance_features_components)] {
    pub appearance_feature_ids: Vec<u64>,
  }
}

#[table(name = entity_observations, public)]
#[derive(Debug, Clone)]
pub struct EntityObservations {
    #[index(btree)]
    pub entity_id: u64,
    #[index(btree)]
    pub observable_event_id: u64,
}

pub trait GetRng {
    fn get_rng(&self) -> StdRng;
}

impl<T: __rng_seed__Trait> GetRng for T {
    fn get_rng(&self) -> StdRng {
        StdRng::seed_from_u64(self.rng_seed().rng_seed)
    }
}

pub struct MapGenerationResult {
    pub room_ids: Vec<u64>,
}

pub trait MapGenerator {
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult;
}

// WIP Add a trait for `entity_id()`.
impl<'a, T: WithEntityHandle<'a> + __unrealized_map__Trait + __rng_seed__Trait> MapGenerator for T {
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult {
        let af_ctx = AppearanceFeatureContext::new(ctx);
        let map = self.unrealized_map();
        let mut rng = self.get_rng();
        let total_room_count = map.extra_room_count + map.main_room_count;
        let room_handles: Vec<EntityHandle> = (0..total_room_count)
            .map(|_| {
                ctx.ecs()
                    .new()
                    .set_appearance_feature_ids(af_ctx.by_texts(&["room"]))
                    .set_location_map(0) // WIP self.entity_id()
            })
            .collect();

        for i in 0..(map.main_room_count as usize - 1) {
            let a = &room_handles[i];
            let b = &room_handles[i + 1];
            ctx.ecs()
                .new()
                .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
                .add_location(a.entity_id)
                .add_path(b.entity_id);
            ctx.ecs()
                .new()
                .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
                .add_location(b.entity_id)
                .add_path(a.entity_id);
        }

        for i in (map.main_room_count as u32)..(total_room_count as u32) {
            let a = &room_handles[i as usize];
            let b = &room_handles[(rng.next_u32() % i) as usize];
            ctx.ecs()
                .new()
                .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
                .add_location(a.entity_id)
                .add_path(b.entity_id);
            ctx.ecs()
                .new()
                .set_appearance_feature_ids(af_ctx.by_texts(&["path"]))
                .add_location(b.entity_id)
                .add_path(a.entity_id);
        }

        MapGenerationResult {
            room_ids: room_handles.iter().map(|h| h.entity_id).collect(),
        }
    }
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ComponentSet {
    pub entity_id: u64,
    pub hp_component: Option<HpComponent>,
    pub ep_component: Option<EpComponent>,
    pub actions_component: Option<ActionsComponent>,
    pub action_hotkeys_component: Option<ActionHotkeysComponent>,
    pub allegiance_component: Option<AllegianceComponent>,
    pub player_controller_component: Option<PlayerControllerComponent>,
    pub baseline_component: Option<BaselineComponent>,
    pub traits_component: Option<TraitsComponent>,
}

#[table(name = named_inactive_entities)]
#[derive(Debug, Clone)]
pub struct NamedInactiveEntity {
    #[primary_key]
    pub prefab_name: String,
    pub component_set: ComponentSet,
}

#[table(name = identity_inactive_entities)]
#[derive(Debug, Clone)]
pub struct IdentityInactiveEntity {
    #[unique]
    pub identity: Identity,
    pub component_set: ComponentSet,
}

impl Entity {
    pub fn new_player(ctx: &ReducerContext) -> Result<EntityHandle, String> {
        Ok(ctx
            .ecs()
            .new()
            .add_player_controller(ctx.sender)
            .set_allegiance(
                EntityHandle::from_name(ctx, "allegiance1")
                    .ok_or("Cannot find starting allegiance.")?
                    .entity_id(),
            )
            .add_location(
                EntityHandle::from_name(ctx, "room1")
                    .ok_or("Cannot find starting room.")?
                    .entity_id(),
            )
            .set_baseline("human")
            .add_trait("admin")
            .add_trait("mobile")
            .add_trait("bopper")
            .set_hotkey("bop", 'b')
            .set_hotkey("boppity_bop", 'v')
            .set_hotkey("quick_move", 'm')
            .set_hotkey("divine_heal", 'h'))
    }
}

pub struct InactiveEntityHandle<'a> {
    pub ctx: &'a ReducerContext,
    pub component_set: ComponentSet,
}

pub trait TriggerFlag {
    fn trigger_total_stat_block_dirty_flag(self) -> Self;
}

impl<'a, T: WithEntityHandle<'a> + Option__total_stat_block_dirty_flag__Trait> TriggerFlag for T {
    fn trigger_total_stat_block_dirty_flag(self) -> Self {
        self.insert_total_stat_block_dirty_flag(FlagComponent {
            entity_id: self.entity_id(),
        });
        self
    }
}

impl<'a> InactiveEntityHandle<'a> {
    pub fn from_player_identity(ctx: &'a ReducerContext) -> Option<Self> {
        let result = ctx
            .db
            .identity_inactive_entities()
            .identity()
            .find(ctx.sender)
            .map(|i| Self {
                ctx,
                component_set: i.component_set,
            });
        ctx.db
            .identity_inactive_entities()
            .identity()
            .delete(ctx.sender);
        result
    }

    pub fn activate(self) -> EntityHandle<'a> {
        let id = self.component_set.entity_id;
        self.activate_with_id(id)
    }

    pub fn activate_with_id(self, id: u64) -> EntityHandle<'a> {
        let e = EntityHandle::insert_id(self.ctx, id);
        if let Some(mut c) = self.component_set.actions_component {
            c.entity_id = e.entity_id;
            self.ctx.db.actions_components().insert(c);
        }
        if let Some(mut c) = self.component_set.action_hotkeys_component {
            c.entity_id = e.entity_id;
            self.ctx.db.action_hotkeys_components().insert(c);
        }
        if let Some(mut c) = self.component_set.allegiance_component {
            c.entity_id = e.entity_id;
            self.ctx.db.allegiance_components().insert(c);
        }
        if let Some(mut c) = self.component_set.ep_component {
            c.entity_id = e.entity_id;
            self.ctx.db.ep_components().insert(c);
        }
        if let Some(mut c) = self.component_set.hp_component {
            c.entity_id = e.entity_id;
            self.ctx.db.hp_components().insert(c);
        }
        if let Some(mut c) = self.component_set.player_controller_component {
            c.entity_id = e.entity_id;
            self.ctx.db.player_controller_components().insert(c);
        }
        if let Some(mut c) = self.component_set.baseline_component {
            c.entity_id = e.entity_id;
            self.ctx.db.baseline_components().insert(c);
            self.ctx
                .db
                .total_stat_block_dirty_flag_components()
                .insert(FlagComponent {
                    entity_id: e.entity_id,
                });
        }
        if let Some(mut c) = self.component_set.traits_component {
            c.entity_id = e.entity_id;
            self.ctx.db.traits_components().insert(c);
            self.ctx
                .db
                .traits_stat_block_dirty_flag_components()
                .insert(FlagComponent {
                    entity_id: e.entity_id,
                });
        }

        // TODO Assign location from callsite instead?
        match EntityHandle::from_name(self.ctx, "room1") {
            Some(l) => e.add_location(l.entity_id()),
            None => e,
        }
    }
}

impl<'a> EntityHandle<'a> {
    pub fn insert_id(ctx: &'a ReducerContext, id: u64) -> Self {
        let entity = ctx.db.entities().insert(Entity { id });
        Self {
            entity_id: entity.id,
            ecs: ctx.ecs(),
        }
    }

    pub fn from_player_identity(
        ctx: &'a ReducerContext,
    ) -> Option<With__player_controller__Component<EntityHandle<'a>>> {
        ctx.db
            .player_controller_components()
            .identity()
            .find(ctx.sender)
            .map(|p| p.into_player_controller_handle(ctx))
    }

    pub fn from_name(
        ctx: &'a ReducerContext,
        name: &str,
    ) -> Option<With__name__Component<EntityHandle<'a>>> {
        ctx.db
            .name_components()
            .name()
            .find(name.to_string())
            .map(|n| n.into_name_handle(ctx))
    }

    pub fn generate_prominence(self) -> Self {
        let mut prominence = 0;
        if self.path().is_some() {
            prominence |= 1 << 8;
        }
        // TODO Add other controller types.
        if self.player_controller().is_some() {
            prominence |= 1 << 7;
        }
        if self.hp().is_some() {
            prominence |= 1 << 6;
        }

        self.insert_entity_prominence(EntityProminenceComponent {
            entity_id: self.entity_id,
            prominence,
        });

        self
    }

    pub fn set_name(self, name: &str) -> Self {
        self.insert_name(NameComponent {
            entity_id: self.entity_id,
            name: name.to_string(),
        });
        self
    }

    pub fn set_target(self, target_entity_id: u64) -> Self {
        let entity_id = self.entity_id;
        self.upsert_target(TargetComponent {
            entity_id,
            target_entity_id,
        })
        .into_handle()
    }

    pub fn delete_target_component(self) -> Self {
        self.delete_target();
        self
    }

    pub fn add_location(self, location_entity_id: u64) -> Self {
        let entity_id = self.entity_id;
        self.upsert_location(LocationComponent {
            entity_id,
            location_entity_id,
        })
        .into_handle()
    }

    pub fn set_location_map(self, map_entity_id: u64) -> Self {
        let entity_id = self.entity_id;
        self.upsert_location_map(LocationMapComponent {
            entity_id,
            map_entity_id,
        })
        .into_handle()
    }

    pub fn add_path(self, destination_entity_id: u64) -> Self {
        let entity_id = self.entity_id;
        self.upsert_path(PathComponent {
            // WIP Make entity_id private and move component construction into macro functions.
            entity_id,
            destination_entity_id,
        })
        .into_handle()
    }

    pub fn has_path(&self) -> bool {
        self.path().is_some()
    }

    pub fn set_allegiance(self, allegiance_entity_id: u64) -> Self {
        let entity_id = self.entity_id;
        self.upsert_allegiance(AllegianceComponent {
            entity_id,
            allegiance_entity_id,
        })
        .into_handle()
    }

    pub fn allegiance_id(&self) -> Option<u64> {
        self.allegiance().map(|a| a.allegiance_entity_id)
    }

    pub fn is_ally(&self, other_entity_id: u64) -> bool {
        if self.entity_id == other_entity_id {
            return true;
        }

        if let (Some(a), Some(o)) = (
            self.allegiance_id(),
            self.ecs.find(other_entity_id).allegiance_id(),
        ) {
            a == o
        } else {
            false
        }
    }

    pub fn set_actions(self, action_ids: Vec<u64>) -> Self {
        if let Some(mut c) = self.actions() {
            c.action_ids = action_ids;
            self.update_actions(c);
        } else {
            self.insert_actions(ActionsComponent {
                entity_id: self.entity_id,
                action_ids,
            });
        }
        self
    }

    pub fn set_baseline(self, name: &str) -> Self {
        if let Some(b) = self.ecs.db.baselines().name().find(name.to_string()) {
            let entity_id = self.entity_id;
            self.upsert_baseline(BaselineComponent {
                entity_id,
                baseline_id: b.id,
            })
            .trigger_total_stat_block_dirty_flag()
            .into_handle()
        } else {
            self
        }
    }

    pub fn add_trait(self, name: &str) -> Self {
        if let Some(t) = self.ecs.db.traits().name().find(name.to_string()) {
            if let Some(mut c) = self.traits() {
                c.trait_ids.push(t.id);
                self.update_traits(c);
            } else {
                self.insert_traits(TraitsComponent {
                    entity_id: self.entity_id,
                    trait_ids: vec![t.id],
                });
            }

            self.trigger_traits_stat_block_dirty_flag()
        } else {
            self
        }
    }

    pub fn set_appearance_feature_ids(self, appearance_feature_ids: Vec<u64>) -> Self {
        let entity_id = self.entity_id;
        self.upsert_appearance_features(AppearanceFeaturesComponent {
            entity_id,
            appearance_feature_ids,
        })
        .into_handle()
    }

    pub fn apply_stat_block(self, stat_block: StatBlock) -> Self {
        self.delete_total_stat_block_dirty_flag();

        let mut action_ids = stat_block.additive_action_ids.clone();
        action_ids.retain(|id| !stat_block.subtractive_action_ids.contains(id));
        self.set_attack(stat_block.attack)
            .set_mhp(stat_block.mhp)
            .set_mep(stat_block.mep)
            .set_defense(stat_block.defense)
            .set_actions(action_ids)
            .set_appearance_feature_ids(stat_block.appearance_feature_ids)
    }

    pub fn trigger_traits_stat_block_dirty_flag(self) -> Self {
        self.insert_traits_stat_block_dirty_flag(FlagComponent {
            entity_id: self.entity_id,
        });
        self
    }

    pub fn set_traits_stat_block_cache(self, stat_block: StatBlock) -> Self {
        let entity_id = self.entity_id;
        self.delete_traits_stat_block_dirty_flag();
        self.upsert_traits_stat_block_cache(StatBlockCacheComponent {
            entity_id,
            stat_block,
        })
        .into_handle()
    }

    pub fn set_attack(self, attack: i32) -> Self {
        let entity_id = self.entity_id;
        self.upsert_attack(AttackComponent { entity_id, attack })
            .into_handle()
    }

    pub fn set_mhp(self, mhp: i32) -> Self {
        if let Some(mut hp) = self.hp() {
            hp.mhp = mhp;
            self.update_hp(hp);
        } else {
            self.insert_hp(HpComponent {
                entity_id: self.entity_id,
                mhp,
                hp: mhp,
                defense: 0,
                accumulated_damage: 0,
                accumulated_healing: 0,
            });
        }
        self
    }

    pub fn set_defense(self, defense: i32) -> Self {
        if let Some(mut hp_component) = self.hp() {
            hp_component.defense = defense;
            self.update_hp(hp_component);
        } else {
            self.insert_hp(HpComponent {
                entity_id: self.entity_id,
                mhp: 0,
                hp: 0,
                defense,
                accumulated_damage: 0,
                accumulated_healing: 0,
            });
        }
        self
    }

    pub fn has_hp(&self) -> bool {
        self.hp().is_some()
    }

    pub fn set_mep(self, mep: i32) -> Self {
        if let Some(mut ep_component) = self.ep() {
            ep_component.mep = mep;
            self.update_ep(ep_component);
        } else {
            self.insert_ep(EpComponent {
                entity_id: self.entity_id,
                mep,
                ep: mep,
            });
        }
        self
    }

    // pub fn add_action_option(self, action_id: u64, target_entity_id: u64) -> Self {
    //     if let Some(mut a) = self.action_options() {
    //         a.action_options.push(ActionOption {
    //             action_id,
    //             target_entity_id,
    //         });
    //         self.update_action_options(a);
    //     } else {
    //         self.insert_action_options(ActionOptionsComponent {
    //             entity_id: self.entity_id,
    //             action_options: vec![ActionOption {
    //                 action_id,
    //                 target_entity_id,
    //             }],
    //         });
    //     }
    //     self
    // }

    pub fn set_queued_action_state(self, action_id: u64, target_entity_id: u64) -> Self {
        self.delete_queued_action_state();
        self.insert_queued_action_state(ActionStateComponent {
            action_id,
            entity_id: self.entity_id,
            sequence_index: 0,
            target_entity_id,
        });
        self
    }

    pub fn shift_queued_action_state(self) -> Self {
        if let Some(queued_action_state) = self.queued_action_state() {
            self.delete_queued_action_state();
            self.insert_action_state(queued_action_state);
        }
        self
    }

    pub fn add_player_controller(self, identity: Identity) -> Self {
        self.insert_player_controller(PlayerControllerComponent {
            entity_id: self.entity_id,
            identity,
        });
        self
    }

    pub fn set_hotkey(self, name: &str, character: char) -> Self {
        let action_id = if let Some(action) = self.ecs.db.actions().name().find(name.to_string()) {
            action.id
        } else {
            return self;
        };
        let character_code = character as u32;
        if let Some(mut a) = self.action_hotkeys() {
            a.action_hotkeys
                .retain(|h| h.action_id != action_id && h.character_code != character_code);
            a.action_hotkeys.push(ActionHotkey {
                action_id,
                character_code,
            });
            self.update_action_hotkeys(a);
        } else {
            self.insert_action_hotkeys(ActionHotkeysComponent {
                entity_id: self.entity_id,
                action_hotkeys: vec![ActionHotkey {
                    action_id,
                    character_code,
                }],
            });
        }
        self
    }

    pub fn can_target_other(&self, other_entity_id: u64, action_id: u64) -> bool {
        if let Some(a) = self.ecs.db.actions().id().find(action_id) {
            let o = self.ecs.find(other_entity_id);
            match a.action_type {
                ActionType::Attack => o.has_hp() && !self.is_ally(other_entity_id),
                ActionType::Buff => o.has_hp() && self.is_ally(other_entity_id),
                ActionType::Equip => true,     // WIP
                ActionType::Inventory => true, // WIP
                ActionType::Move => o.has_path(),
            }
        } else {
            false
        }
    }
}
