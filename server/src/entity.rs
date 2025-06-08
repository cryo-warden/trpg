extern crate archetype;

use derive_builder::Builder;
use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    table, Identity, ReducerContext, SpacetimeType, Table,
};

use crate::{
    action::{actions, ActionType},
    appearance::AppearanceFeatureContext,
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
        BaselineComponent, EntityProminenceComponent, EpComponent, HpComponent, LocationComponent,
        LocationMapComponent, MapComponent, NameComponent, PathComponent,
        PlayerControllerComponent, RngSeedComponent, StatBlockCacheComponent,
        StatBlockDirtyFlagComponent, TargetComponent, TraitsComponent,
    },
    stat_block::{baselines, traits, StatBlock},
};

use archetype::EntityWrap;

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

#[derive(Debug, Clone, SpacetimeType)]
pub enum Archetype {
    ActorArchetype,
    AllegianceArchetype,
    MapArchetype,
    PathArchetype,
    RoomArchetype,
}

pub type EntityId = u64;

#[table(name = entities, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[primary_key]
    #[auto_inc]
    pub id: EntityId,
    pub archetype: Archetype,
}

#[allow(dead_code, unused_variables)]
pub trait EntityWrap: Sized + Clone {
    fn entity_id(&self) -> EntityId;
    fn archetype(&self) -> Archetype;
    fn update(self, ctx: &ReducerContext) -> Self;
    fn insert(self, ctx: &ReducerContext) -> Self;

    fn action_hotkeys(&self) -> Option<&ActionHotkeysComponent> {
        None
    }
    fn action_options(&self) -> Option<&ActionOptionsComponent> {
        None
    }
    fn action_state_component(&self) -> Option<&ActionStateComponent> {
        None
    }
    fn actions(&self) -> Option<&ActionsComponent> {
        None
    }
    fn allegiance(&self) -> Option<&AllegianceComponent> {
        None
    }
    fn appearance_features(&self) -> Option<&AppearanceFeaturesComponent> {
        None
    }
    fn attack(&self) -> Option<&AttackComponent> {
        None
    }
    fn baseline(&self) -> Option<&BaselineComponent> {
        None
    }
    // TODO EntityDeactivationTimerComponent TODO Generate code to handle optional field type.
    fn entity_prominence(&self) -> Option<&EntityProminenceComponent> {
        None
    }
    fn ep(&self) -> Option<&EpComponent> {
        None
    }
    fn hp(&self) -> Option<&HpComponent> {
        None
    }
    fn location(&self) -> Option<&LocationComponent> {
        None
    }
    fn location_map(&self) -> Option<&LocationMapComponent> {
        None
    }
    fn map(&self) -> Option<&MapComponent> {
        None
    }
    // TODO ObserverComponent TODO denormalize
    fn path(&self) -> Option<&PathComponent> {
        None
    }
    fn player_controller(&self) -> Option<&PlayerControllerComponent> {
        None
    }
    fn rng_seed(&self) -> Option<&RngSeedComponent> {
        None
    }
    fn target(&self) -> Option<&TargetComponent> {
        None
    }
    fn traits(&self) -> Option<&TraitsComponent> {
        None
    }

    fn set_action_hotkeys(self, action_hotkeys: ActionHotkeysComponent) -> Self {
        self
    }
    fn set_action_options(self, action_hotkeys: ActionOptionsComponent) -> Self {
        self
    }
    fn set_action_state_component(self, action_state_component: ActionStateComponent) -> Self {
        self
    }
    fn set_actions(self, actions: ActionsComponent) -> Self {
        self
    }
    fn set_allegiance(self, allegiance: AllegianceComponent) -> Self {
        self
    }
    fn set_appearance_features(self, appearance_features: AppearanceFeaturesComponent) -> Self {
        self
    }
    fn set_attack(self, attack: AttackComponent) -> Self {
        self
    }
    fn set_baseline(self, baseline: BaselineComponent) -> Self {
        self
    }
    fn set_entity_prominence(self, entity_prominence: EntityProminenceComponent) -> Self {
        self
    }
    fn set_ep(self, ep: EpComponent) -> Self {
        self
    }
    fn set_hp(self, hp: HpComponent) -> Self {
        self
    }
    fn set_location(self, location: LocationComponent) -> Self {
        self
    }
    fn set_location_map(self, location_map: LocationMapComponent) -> Self {
        self
    }
    fn set_map(self, map: MapComponent) -> Self {
        self
    }
    fn set_path(self, path: PathComponent) -> Self {
        self
    }
    fn set_player_controller(self, player_controller: PlayerControllerComponent) -> Self {
        self
    }
    fn set_rng_seed(self, rng_seed: RngSeedComponent) -> Self {
        self
    }
    fn set_target(self, target: TargetComponent) -> Self {
        self
    }
    fn set_traits(self, traits: TraitsComponent) -> Self {
        self
    }
}

#[allow(dead_code)]
pub trait StatBlockApplier {
    fn apply_stat_block(self, stat_block: StatBlock) -> Self;
}

impl<T: EntityWrap> StatBlockApplier for T {
    fn apply_stat_block(self, stat_block: StatBlock) -> Self {
        let hp = HpComponent {
            mhp: stat_block.mhp,
            defense: stat_block.defense,
            ..self.hp().map(|c| c.clone()).unwrap_or_default()
        };
        let ep = EpComponent {
            mep: stat_block.mep,
            ..self.ep().map(|c| c.clone()).unwrap_or_default()
        };
        let attack = AttackComponent {
            attack: stat_block.attack,
            ..self.attack().map(|c| c.clone()).unwrap_or_default()
        };
        let appearance_features = AppearanceFeaturesComponent {
            appearance_feature_ids: stat_block.appearance_feature_ids,
            ..self
                .appearance_features()
                .map(|c| c.clone())
                .unwrap_or_default()
        };
        let actions = ActionsComponent {
            action_ids: stat_block.additive_action_ids,
            ..self.actions().map(|c| c.clone()).unwrap_or_default()
        };

        self.set_hp(hp)
            .set_ep(ep)
            .set_attack(attack)
            .set_appearance_features(appearance_features)
            .set_actions(actions)
    }
}

pub trait RngSeeded {
    fn get_rng(&self) -> StdRng;
}

impl<T: EntityWrap> RngSeeded for T {
    fn get_rng(&self) -> StdRng {
        match self.rng_seed() {
            Some(s) => StdRng::seed_from_u64(s.rng_seed),
            None => StdRng::seed_from_u64(0),
        }
    }
}

#[table(name = actor_archetypes, public)]
#[derive(Debug, Clone, Default, Builder, EntityWrap)]
#[entity_wrap(table = actor_archetypes)]
pub struct ActorArchetype {
    #[unique]
    pub entity_id: EntityId,
    pub actions: ActionsComponent,
    pub allegiance: AllegianceComponent,
    pub appearance_features: AppearanceFeaturesComponent,
    pub attack: AttackComponent,
    pub baseline: BaselineComponent,
    pub ep: EpComponent,
    pub hp: HpComponent,
    pub location: LocationComponent,
    pub traits: TraitsComponent,
}

impl ActorArchetype {
    pub fn new(
        allegiance_entity_id: EntityId,
        location_entity_id: EntityId,
        baseline_id: u64,
        trait_ids: Vec<u64>,
    ) -> Self {
        Self {
            entity_id: 0,
            actions: ActionsComponent {
                entity_id: 0,
                action_ids: vec![],
            },
            allegiance: AllegianceComponent {
                entity_id: 0,
                allegiance_entity_id,
            },
            appearance_features: AppearanceFeaturesComponent {
                entity_id: 0,
                appearance_feature_ids: vec![],
            },
            attack: AttackComponent {
                entity_id: 0,
                attack: 5,
            },
            baseline: BaselineComponent {
                entity_id: 0,
                baseline_id,
            },
            ep: EpComponent {
                entity_id: 0,
                ep: 5,
                mep: 5,
            },
            hp: HpComponent {
                entity_id: 0,
                hp: 5,
                mhp: 5,
                defense: 5,
                accumulated_damage: 0,
                accumulated_healing: 0,
            },
            location: LocationComponent {
                entity_id: 0,
                location_entity_id,
            },
            traits: TraitsComponent {
                entity_id: 0,
                trait_ids,
            },
        }
    }
}

#[table(name = allegiance_archetypes, public)]
#[derive(Debug, Clone, Builder, EntityWrap)]
#[entity_wrap(table = allegiance_archetypes)]
pub struct AllegianceArchetype {
    #[unique]
    pub entity_id: EntityId,
}

impl AllegianceArchetype {
    pub fn new() -> Self {
        Self { entity_id: 0 }
    }
}

#[table(name = map_archetypes, public)]
#[derive(Debug, Clone, Builder, EntityWrap)]
#[entity_wrap(table = map_archetypes)]
pub struct MapArchetype {
    #[unique]
    pub entity_id: EntityId,
    pub map: MapComponent,
    pub rng_seed: RngSeedComponent,
}

pub struct MapArchetypeGenerationResult {
    pub rooms: Vec<RoomArchetype>,
}

impl MapArchetype {
    pub fn generate(&self, ctx: &ReducerContext) -> MapArchetypeGenerationResult {
        let af_ctx = AppearanceFeatureContext::new(ctx);
        let mut rng = self.get_rng();
        let total_room_count = self.map.extra_room_count + self.map.main_room_count;
        let rooms: Vec<RoomArchetype> = (0..total_room_count)
            .map(|_| RoomArchetype::new(af_ctx.by_texts(&["room"]), self.entity_id))
            .collect();

        for i in 0..(self.map.main_room_count as usize - 1) {
            let a = &rooms[i];
            let b = &rooms[i + 1];
            PathArchetype::new(af_ctx.by_texts(&["path"]), a.entity_id, b.entity_id).insert(ctx);
            PathArchetype::new(af_ctx.by_texts(&["path"]), b.entity_id, a.entity_id).insert(ctx);
        }

        for i in (self.map.main_room_count as u32)..(total_room_count as u32) {
            let a = &rooms[i as usize];
            let b = &rooms[(rng.next_u32() % i) as usize];
            PathArchetype::new(af_ctx.by_texts(&["path"]), a.entity_id, b.entity_id).insert(ctx);
            PathArchetype::new(af_ctx.by_texts(&["path"]), b.entity_id, a.entity_id).insert(ctx);
        }

        MapArchetypeGenerationResult { rooms }
    }
}

#[table(name = path_archetypes, public)]
#[derive(Debug, Clone, Builder, EntityWrap)]
#[entity_wrap(table = path_archetypes)]
pub struct PathArchetype {
    #[unique]
    pub entity_id: EntityId,
    pub appearance_features: AppearanceFeaturesComponent,
    pub location: LocationComponent,
    pub path: PathComponent,
}

impl PathArchetype {
    pub fn new(
        appearance_feature_ids: Vec<u64>,
        location_entity_id: EntityId,
        destination_entity_id: EntityId,
    ) -> Self {
        Self {
            entity_id: 0,
            appearance_features: AppearanceFeaturesComponent {
                entity_id: 0,
                appearance_feature_ids,
            },
            location: LocationComponent {
                entity_id: 0,
                location_entity_id,
            },
            path: PathComponent {
                entity_id: 0,
                destination_entity_id,
            },
        }
    }
}

#[table(name = room_archetypes, public)]
#[derive(Debug, Clone, Builder, EntityWrap)]
#[entity_wrap(table = room_archetypes)]
pub struct RoomArchetype {
    #[unique]
    pub entity_id: EntityId,
    pub appearance_features: AppearanceFeaturesComponent,
    pub location_map: LocationMapComponent,
}

impl RoomArchetype {
    pub fn new(appearance_feature_ids: Vec<u64>, map_entity_id: EntityId) -> Self {
        Self {
            entity_id: 0,
            appearance_features: AppearanceFeaturesComponent {
                entity_id: 0,
                appearance_feature_ids,
            },
            location_map: LocationMapComponent {
                entity_id: 0,
                map_entity_id,
            },
        }
    }
}

impl Entity {
    pub fn new_player_archetype(ctx: &ReducerContext) -> Result<ActorArchetype, String> {
        Ok(ActorArchetype::new(0, 0, 0, vec![]).insert(ctx))
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
            self.ctx.db.total_stat_block_dirty_flag_components().insert(
                StatBlockDirtyFlagComponent {
                    entity_id: e.entity_id,
                },
            );
        }
        if let Some(mut c) = self.component_set.traits_component {
            c.entity_id = e.entity_id;
            self.ctx.db.traits_components().insert(c);
            self.ctx
                .db
                .traits_stat_block_dirty_flag_components()
                .insert(StatBlockDirtyFlagComponent {
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
        let entity = ctx.db.entities().insert(Entity {
            id,
            archetype: Archetype::ActorArchetype,
        });
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
            .insert(StatBlockDirtyFlagComponent {
                entity_id: self.entity_id,
            });
        self
    }
    pub fn trigger_total_stat_block_dirty_flag(self) -> Self {
        self.ctx
            .db
            .total_stat_block_dirty_flag_components()
            .insert(StatBlockDirtyFlagComponent {
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
