use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    table, Identity, ReducerContext, SpacetimeType, Table,
};

use crate::{
    action::{actions, ActionType},
    component::{
        action_hotkeys_components, action_options_components, action_state_components,
        actions_components, allegiance_components, appearance_features_components,
        attack_components, baseline_components, entity_deactivation_timer_components,
        entity_prominence_components, ep_components, hp_components, location_components,
        location_map_components, name_components, observer_components, path_components,
        player_controller_components, queued_action_state_components, rng_seed_components,
        target_components, total_stat_block_dirty_flag_components, traits_components,
        traits_stat_block_cache_components, traits_stat_block_dirty_flag_components, ActionHotkey,
        ActionHotkeysComponent, ActionOption, ActionOptionsComponent, ActionStateComponent,
        ActionsComponent, AllegianceComponent, AppearanceFeaturesComponent, AttackComponent,
        BaselineComponent, EntityProminenceComponent, EpComponent, FlagComponent, HpComponent,
        LocationComponent, LocationMapComponent, NameComponent, PathComponent,
        PlayerControllerComponent, RngSeedComponent, StatBlockCacheComponent, TargetComponent,
        TraitsComponent,
    },
    stat_block::{baselines, traits, StatBlock},
};

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

#[table(name = entities, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
}

impl Entity {
    pub fn new_player(ctx: &ReducerContext) -> Result<EntityHandle, String> {
        Ok(EntityHandle::new(ctx)
            .add_player_controller(ctx.sender)
            .set_allegiance(
                EntityHandle::from_name(ctx, "allegiance1")
                    .ok_or("Cannot find starting allegiance.")?
                    .entity_id,
            )
            .add_location(
                EntityHandle::from_name(ctx, "room1")
                    .ok_or("Cannot find starting room.")?
                    .entity_id,
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

#[allow(dead_code)]
impl<'a> InactiveEntityHandle<'a> {
    pub fn from_prefab_name(ctx: &'a ReducerContext, prefab_name: &str) -> Option<Self> {
        ctx.db
            .named_inactive_entities()
            .prefab_name()
            .find(prefab_name.to_string())
            .map(|i| Self {
                ctx,
                component_set: i.component_set,
            })
    }

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
            Some(l) => e.add_location(l.entity_id),
            None => e,
        }
    }
}

pub struct EntityHandle<'a> {
    pub ctx: &'a ReducerContext,
    pub entity_id: u64,
}

#[allow(dead_code)]
impl<'a> EntityHandle<'a> {
    pub fn insert_id(ctx: &'a ReducerContext, id: u64) -> Self {
        let entity = ctx.db.entities().insert(Entity { id });
        Self {
            ctx,
            entity_id: entity.id,
        }
    }

    pub fn new(ctx: &'a ReducerContext) -> Self {
        Self::insert_id(ctx, 0)
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

    pub fn from_name(ctx: &'a ReducerContext, name: &str) -> Option<Self> {
        ctx.db
            .name_components()
            .name()
            .find(name.to_string())
            .map(|n| Self {
                ctx,
                entity_id: n.entity_id,
            })
    }

    pub fn generate_prominence(self) -> Self {
        let mut prominence = 0;
        if self
            .ctx
            .db
            .path_components()
            .entity_id()
            .find(self.entity_id)
            .is_some()
        {
            prominence |= 1 << 8;
        }
        // TODO Add other controller types.
        if self
            .ctx
            .db
            .player_controller_components()
            .entity_id()
            .find(self.entity_id)
            .is_some()
        {
            prominence |= 1 << 7;
        }
        if self
            .ctx
            .db
            .hp_components()
            .entity_id()
            .find(self.entity_id)
            .is_some()
        {
            prominence |= 1 << 6;
        }

        self.ctx
            .db
            .entity_prominence_components()
            .insert(EntityProminenceComponent {
                entity_id: self.entity_id,
                prominence,
            });

        self
    }

    pub fn delete(self) {
        self.ctx
            .db
            .actions_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .action_hotkeys_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .action_options_components()
            .entity_id()
            .delete(self.entity_id);

        self.ctx
            .db
            .action_state_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .queued_action_state_components()
            .entity_id()
            .delete(self.entity_id);

        self.ctx
            .db
            .allegiance_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .ep_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .hp_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .location_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .name_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .path_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .player_controller_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .target_components()
            .entity_id()
            .delete(self.entity_id);

        self.ctx
            .db
            .entity_prominence_components()
            .entity_id()
            .delete(self.entity_id);

        self.ctx
            .db
            .observer_components()
            .entity_id()
            .delete(self.entity_id);

        self.ctx
            .db
            .entity_deactivation_timer_components()
            .entity_id()
            .delete(self.entity_id);

        self.ctx
            .db
            .baseline_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .traits_components()
            .entity_id()
            .delete(self.entity_id);

        self.ctx.db.entities().id().delete(self.entity_id);
        log::debug!("Deleted entity {}.", self.entity_id);
    }

    pub fn deactivate(self) {
        let component_set = ComponentSet {
            entity_id: self.entity_id,
            actions_component: self
                .ctx
                .db
                .actions_components()
                .entity_id()
                .find(self.entity_id),
            action_hotkeys_component: self
                .ctx
                .db
                .action_hotkeys_components()
                .entity_id()
                .find(self.entity_id),
            allegiance_component: self
                .ctx
                .db
                .allegiance_components()
                .entity_id()
                .find(self.entity_id),
            hp_component: self.ctx.db.hp_components().entity_id().find(self.entity_id),
            ep_component: self.ctx.db.ep_components().entity_id().find(self.entity_id),
            player_controller_component: self
                .ctx
                .db
                .player_controller_components()
                .entity_id()
                .find(self.entity_id),
            baseline_component: self
                .ctx
                .db
                .baseline_components()
                .entity_id()
                .find(self.entity_id),
            traits_component: self
                .ctx
                .db
                .traits_components()
                .entity_id()
                .find(self.entity_id),
        };
        if let Some(p) = self
            .ctx
            .db
            .player_controller_components()
            .entity_id()
            .find(self.entity_id)
        {
            self.ctx
                .db
                .identity_inactive_entities()
                .insert(IdentityInactiveEntity {
                    identity: p.identity,
                    component_set,
                });
        } else if let Some(n) = self
            .ctx
            .db
            .name_components()
            .entity_id()
            .find(self.entity_id)
        {
            self.ctx
                .db
                .named_inactive_entities()
                .insert(NamedInactiveEntity {
                    prefab_name: n.name,
                    component_set,
                });
        }

        self.delete();
    }

    pub fn set_name(self, name: &str) -> Self {
        self.ctx.db.name_components().insert(NameComponent {
            entity_id: self.entity_id,
            name: name.to_string(),
        });
        self
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

    pub fn set_location_map(self, map_entity_id: u64) -> Self {
        match self
            .ctx
            .db
            .location_map_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => {
                self.ctx
                    .db
                    .location_map_components()
                    .insert(LocationMapComponent {
                        entity_id: self.entity_id,
                        map_entity_id,
                    });
            }
            Some(mut c) => {
                c.map_entity_id = map_entity_id;
                self.ctx.db.location_map_components().entity_id().update(c);
            }
        }
        self
    }

    pub fn set_rng_seed(self, rng_seed: u64) -> Self {
        match self
            .ctx
            .db
            .rng_seed_components()
            .entity_id()
            .find(self.entity_id)
        {
            Some(mut c) => {
                c.rng_seed = rng_seed;
                self.ctx.db.rng_seed_components().entity_id().update(c);
            }
            None => {
                self.ctx.db.rng_seed_components().insert(RngSeedComponent {
                    entity_id: self.entity_id,
                    rng_seed,
                });
            }
        }
        self
    }

    pub fn get_rng(&self) -> StdRng {
        let c = match self
            .ctx
            .db
            .rng_seed_components()
            .entity_id()
            .find(self.entity_id)
        {
            Some(s) => s,
            None => self.ctx.db.rng_seed_components().insert(RngSeedComponent {
                entity_id: self.entity_id,
                rng_seed: self.ctx.rng().next_u64(),
            }),
        };
        StdRng::seed_from_u64(c.rng_seed)
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

    pub fn add_action(self, name: &str) -> Self {
        if let Some(action) = self.ctx.db.actions().name().find(name.to_string()) {
            if let Some(mut c) = self
                .ctx
                .db
                .actions_components()
                .entity_id()
                .find(self.entity_id)
            {
                c.action_ids.push(action.id);
                self.ctx.db.actions_components().entity_id().update(c);
            } else {
                self.ctx.db.actions_components().insert(ActionsComponent {
                    entity_id: self.entity_id,
                    action_ids: vec![action.id],
                });
            }
        } else {
            log::debug!("Cannot find action \"{}\" to add.", name);
        }

        self
    }

    pub fn set_actions(self, action_ids: Vec<u64>) -> Self {
        match self
            .ctx
            .db
            .actions_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => {
                self.ctx.db.actions_components().insert(ActionsComponent {
                    entity_id: self.entity_id,
                    action_ids,
                });
            }
            Some(mut c) => {
                c.action_ids = action_ids;
                self.ctx.db.actions_components().entity_id().update(c);
            }
        }
        self
    }

    pub fn actions(&self) -> Vec<u64> {
        self.ctx
            .db
            .actions_components()
            .entity_id()
            .find(self.entity_id)
            .map(|a| a.action_ids)
            .unwrap_or(vec![])
    }

    pub fn set_baseline(self, name: &str) -> Self {
        if let Some(b) = self.ctx.db.baselines().name().find(name.to_string()) {
            self.ctx.db.baseline_components().insert(BaselineComponent {
                entity_id: self.entity_id,
                baseline_id: b.id,
            });

            self.trigger_total_stat_block_dirty_flag()
        } else {
            self
        }
    }

    pub fn add_trait(self, name: &str) -> Self {
        if let Some(t) = self.ctx.db.traits().name().find(name.to_string()) {
            if let Some(mut c) = self
                .ctx
                .db
                .traits_components()
                .entity_id()
                .find(self.entity_id)
            {
                c.trait_ids.push(t.id);
                self.ctx.db.traits_components().entity_id().update(c);
            } else {
                self.ctx.db.traits_components().insert(TraitsComponent {
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
        if let Some(mut c) = self
            .ctx
            .db
            .appearance_features_components()
            .entity_id()
            .find(self.entity_id)
        {
            c.appearance_feature_ids = appearance_feature_ids;
            self.ctx
                .db
                .appearance_features_components()
                .entity_id()
                .update(c);
        } else {
            self.ctx
                .db
                .appearance_features_components()
                .insert(AppearanceFeaturesComponent {
                    entity_id: self.entity_id,
                    appearance_feature_ids,
                });
        }
        self
    }

    pub fn apply_stat_block(self, stat_block: StatBlock) -> Self {
        self.ctx
            .db
            .total_stat_block_dirty_flag_components()
            .entity_id()
            .delete(self.entity_id);

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
        self.ctx
            .db
            .traits_stat_block_dirty_flag_components()
            .insert(FlagComponent {
                entity_id: self.entity_id,
            });
        self
    }
    pub fn trigger_total_stat_block_dirty_flag(self) -> Self {
        self.ctx
            .db
            .total_stat_block_dirty_flag_components()
            .insert(FlagComponent {
                entity_id: self.entity_id,
            });
        self
    }

    pub fn set_traits_stat_block_cache(self, stat_block: StatBlock) -> Self {
        if let Some(mut c) = self
            .ctx
            .db
            .traits_stat_block_cache_components()
            .entity_id()
            .find(self.entity_id)
        {
            c.stat_block = stat_block;
            self.ctx
                .db
                .traits_stat_block_cache_components()
                .entity_id()
                .update(c);
        } else {
            self.ctx
                .db
                .traits_stat_block_cache_components()
                .insert(StatBlockCacheComponent {
                    entity_id: self.entity_id,
                    stat_block,
                });
        }

        self.ctx
            .db
            .traits_stat_block_dirty_flag_components()
            .entity_id()
            .delete(self.entity_id);

        self
    }

    pub fn set_attack(self, attack: i32) -> Self {
        match self
            .ctx
            .db
            .attack_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => {
                self.ctx.db.attack_components().insert(AttackComponent {
                    entity_id: self.entity_id,
                    attack,
                });
            }
            Some(mut c) => {
                c.attack = attack;
                self.ctx.db.attack_components().entity_id().update(c);
            }
        }
        self
    }

    pub fn set_mhp(self, mhp: i32) -> Self {
        match self.ctx.db.hp_components().entity_id().find(self.entity_id) {
            None => {
                self.ctx.db.hp_components().insert(HpComponent {
                    entity_id: self.entity_id,
                    mhp,
                    hp: mhp,
                    defense: 0,
                    accumulated_damage: 0,
                    accumulated_healing: 0,
                });
            }
            Some(mut hp_component) => {
                hp_component.mhp = mhp;
                self.ctx.db.hp_components().entity_id().update(hp_component);
            }
        }
        self
    }

    pub fn set_defense(self, defense: i32) -> Self {
        match self.ctx.db.hp_components().entity_id().find(self.entity_id) {
            None => {
                self.ctx.db.hp_components().insert(HpComponent {
                    entity_id: self.entity_id,
                    mhp: 0,
                    hp: 0,
                    defense,
                    accumulated_damage: 0,
                    accumulated_healing: 0,
                });
            }
            Some(mut hp_component) => {
                hp_component.defense = defense;
                self.ctx.db.hp_components().entity_id().update(hp_component);
            }
        }
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

    pub fn set_mep(self, mep: i32) -> Self {
        match self.ctx.db.ep_components().entity_id().find(self.entity_id) {
            None => {
                self.ctx.db.ep_components().insert(EpComponent {
                    entity_id: self.entity_id,
                    mep,
                    ep: mep,
                });
            }
            Some(mut ep_component) => {
                ep_component.mep = mep;
                self.ctx.db.ep_components().entity_id().update(ep_component);
            }
        }
        self.ctx.db.ep_components().insert(EpComponent {
            entity_id: self.entity_id,
            mep,
            ep: mep,
        });
        self
    }

    pub fn add_action_option(self, action_id: u64, target_entity_id: u64) -> Self {
        match self
            .ctx
            .db
            .action_options_components()
            .entity_id()
            .find(self.entity_id)
        {
            None => {
                self.ctx
                    .db
                    .action_options_components()
                    .insert(ActionOptionsComponent {
                        entity_id: self.entity_id,
                        action_options: vec![ActionOption {
                            action_id,
                            target_entity_id,
                        }],
                    });
            }
            Some(mut a) => {
                a.action_options.push(ActionOption {
                    action_id,
                    target_entity_id,
                });
                self.ctx
                    .db
                    .action_options_components()
                    .entity_id()
                    .update(a);
            }
        };
        self
    }

    pub fn set_queued_action_state(self, action_id: u64, target_entity_id: u64) -> Self {
        self.ctx
            .db
            .queued_action_state_components()
            .entity_id()
            .delete(self.entity_id);
        self.ctx
            .db
            .queued_action_state_components()
            .insert(ActionStateComponent {
                action_id,
                entity_id: self.entity_id,
                sequence_index: 0,
                target_entity_id,
            });
        self
    }

    pub fn shift_queued_action_state(self) -> Self {
        if let Some(queued_action_state) = self
            .ctx
            .db
            .queued_action_state_components()
            .entity_id()
            .find(self.entity_id)
        {
            self.ctx
                .db
                .queued_action_state_components()
                .entity_id()
                .delete(self.entity_id);
            self.ctx
                .db
                .action_state_components()
                .insert(queued_action_state);
        }

        self
    }

    pub fn action_state_component(&self) -> Option<ActionStateComponent> {
        self.ctx
            .db
            .action_state_components()
            .entity_id()
            .find(self.entity_id)
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

    pub fn set_hotkey(self, name: &str, character: char) -> Self {
        let action_id = if let Some(action) = self.ctx.db.actions().name().find(name.to_string()) {
            action.id
        } else {
            return self;
        };
        let character_code = character as u32;
        if let Some(mut a) = self
            .ctx
            .db
            .action_hotkeys_components()
            .entity_id()
            .find(self.entity_id)
        {
            a.action_hotkeys
                .retain(|h| h.action_id != action_id && h.character_code != character_code);
            a.action_hotkeys.push(ActionHotkey {
                action_id,
                character_code,
            });
            self.ctx
                .db
                .action_hotkeys_components()
                .entity_id()
                .update(a);
        } else {
            self.ctx
                .db
                .action_hotkeys_components()
                .insert(ActionHotkeysComponent {
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
        if let Some(a) = self.ctx.db.actions().id().find(action_id) {
            let o = EntityHandle::from_id(self.ctx, other_entity_id);
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
