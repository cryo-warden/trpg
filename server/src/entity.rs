extern crate archetype;

use archetype::entity;
use derive_builder::Builder;
use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    table, ReducerContext, SpacetimeType, Table,
};

use crate::{
    appearance::AppearanceFeatureContext,
    component::{
        entity_names, ActionStateComponent, ActionsComponent, ActionsComponentEntity,
        AllegianceComponent, AllegianceComponentEntity, AppearanceFeaturesComponent,
        AppearanceFeaturesComponentEntity, AttackComponent, AttackComponentEntity,
        BaselineComponent, EntityName, EpComponent, EpComponentEntity, HpComponent,
        HpComponentEntity, LocationComponent, LocationMapComponent, MapComponent,
        MapComponentEntity, PathComponent, RngSeedComponent, RngSeedComponentEntity,
        TraitsComponent,
    },
    stat_block::StatBlock,
};

#[derive(Debug, Clone, Copy, SpacetimeType)]
pub enum Archetype {
    ActorArchetype,
    AllegianceArchetype,
    MapArchetype,
    PathArchetype,
    RoomArchetype,
}

pub type EntityId = u64;

#[allow(dead_code)]
pub trait WithEntityId: Sized + Clone {
    fn entity_id(&self) -> EntityId;
    fn archetype(&self) -> Archetype;
    fn from_entity_id(ctx: &ReducerContext, entity_id: EntityId) -> Option<Self>;
    fn iter_table(ctx: &ReducerContext) -> impl Iterator<Item = Self>;
    fn inactive_from_entity_id(ctx: &ReducerContext, entity_id: EntityId) -> Option<Self>;
    fn update(self, ctx: &ReducerContext) -> Self;
    fn insert(self, ctx: &ReducerContext) -> Self;
    fn activate(self, ctx: &ReducerContext) -> Self;
    fn deactivate(self, ctx: &ReducerContext) -> Self;
}

#[allow(dead_code)]
pub trait Nameable: WithEntityId {
    fn get_name(&self, ctx: &ReducerContext) -> Option<String>;
    fn set_name(self, ctx: &ReducerContext, name: &str) -> Self;
}

impl<T: WithEntityId> Nameable for T {
    fn get_name(&self, ctx: &ReducerContext) -> Option<String> {
        ctx.db
            .entity_names()
            .entity_id()
            .find(self.entity_id())
            .map(|n| n.name)
    }
    fn set_name(self, ctx: &ReducerContext, name: &str) -> Self {
        if let Some(mut n) = ctx.db.entity_names().entity_id().find(self.entity_id()) {
            n.name = name.to_string();
            ctx.db.entity_names().entity_id().update(n);
        } else {
            ctx.db.entity_names().insert(EntityName {
                entity_id: self.entity_id(),
                name: name.to_string(),
            });
        }
        self
    }
}

#[table(name = inactive_entities, public)]
#[table(name = entities, public)]
#[derive(Debug, Clone)]
pub struct Entity {
    #[primary_key]
    #[auto_inc]
    pub id: EntityId,
    pub archetype: Archetype,
}

#[allow(dead_code)]
impl Entity {
    pub fn new_player_archetype(ctx: &ReducerContext) -> Result<ActorArchetype, String> {
        Ok(ActorArchetype::new(0, 0, 0, vec![]).insert(ctx))
    }
    pub fn find_active(ctx: &ReducerContext, entity_id: EntityId) -> Option<Self> {
        ctx.db.entities().id().find(entity_id)
    }
    pub fn find_inactive(ctx: &ReducerContext, entity_id: EntityId) -> Option<Self> {
        ctx.db.entities().id().find(entity_id)
    }
    pub fn is_ally(&self, ctx: &ReducerContext, other_entity_id: EntityId) -> bool {
        if self.id == other_entity_id {
            return true;
        }

        let o = if let Some(o) = Entity::find_active(ctx, other_entity_id) {
            o
        } else {
            return false;
        };
        match (self.archetype, o.archetype) {
            (Archetype::ActorArchetype, Archetype::ActorArchetype) => {
                if let (Some(a), Some(o)) = (
                    ActorArchetype::from_entity_id(ctx, self.id),
                    ActorArchetype::from_entity_id(ctx, o.id),
                ) {
                    a.allegiance().allegiance_entity_id == o.allegiance().allegiance_entity_id
                } else {
                    false
                }
            }
            _ => false,
        }
    }
    pub fn can_be_attacked(&self) -> bool {
        // WIP Move to trait
        match self.archetype {
            Archetype::ActorArchetype => true,
            _ => false,
        }
    }
    pub fn can_be_buffed(&self) -> bool {
        // WIP Move to trait
        match self.archetype {
            Archetype::ActorArchetype => true,
            _ => false,
        }
    }
    pub fn can_be_moved_through(&self) -> bool {
        // WIP Move to trait
        match self.archetype {
            Archetype::PathArchetype => true,
            _ => false,
        }
    }
}

impl WithEntityId for Entity {
    fn entity_id(&self) -> EntityId {
        self.id
    }
    fn archetype(&self) -> Archetype {
        self.archetype.clone()
    }
    fn from_entity_id(ctx: &ReducerContext, entity_id: EntityId) -> Option<Self> {
        ctx.db.entities().id().find(entity_id)
    }
    fn inactive_from_entity_id(ctx: &ReducerContext, entity_id: EntityId) -> Option<Self> {
        ctx.db.inactive_entities().id().find(entity_id)
    }
    fn iter_table(ctx: &ReducerContext) -> impl Iterator<Item = Self> {
        ctx.db.entities().iter()
    }
    fn insert(self, ctx: &ReducerContext) -> Self {
        match self.archetype {
            Archetype::ActorArchetype => {
                ActorArchetype::from_entity_id(ctx, self.id).map(|a| a.insert(ctx));
            }
            Archetype::AllegianceArchetype => {
                AllegianceArchetype::from_entity_id(ctx, self.id).map(|a| a.insert(ctx));
            }
            Archetype::MapArchetype => {
                MapArchetype::from_entity_id(ctx, self.id).map(|a| a.insert(ctx));
            }
            Archetype::PathArchetype => {
                PathArchetype::from_entity_id(ctx, self.id).map(|a| a.insert(ctx));
            }
            Archetype::RoomArchetype => {
                RoomArchetype::from_entity_id(ctx, self.id).map(|a| a.insert(ctx));
            }
        };
        self
    }
    fn update(self, ctx: &ReducerContext) -> Self {
        match self.archetype {
            Archetype::ActorArchetype => {
                ActorArchetype::from_entity_id(ctx, self.id).map(|a| a.update(ctx));
            }
            Archetype::AllegianceArchetype => {
                AllegianceArchetype::from_entity_id(ctx, self.id).map(|a| a.update(ctx));
            }
            Archetype::MapArchetype => {
                MapArchetype::from_entity_id(ctx, self.id).map(|a| a.update(ctx));
            }
            Archetype::PathArchetype => {
                PathArchetype::from_entity_id(ctx, self.id).map(|a| a.update(ctx));
            }
            Archetype::RoomArchetype => {
                RoomArchetype::from_entity_id(ctx, self.id).map(|a| a.update(ctx));
            }
        };
        self
    }
    fn activate(self, ctx: &ReducerContext) -> Self {
        match self.archetype {
            Archetype::ActorArchetype => {
                ActorArchetype::inactive_from_entity_id(ctx, self.id).map(|a| a.activate(ctx));
            }
            Archetype::AllegianceArchetype => {
                AllegianceArchetype::inactive_from_entity_id(ctx, self.id).map(|a| a.activate(ctx));
            }
            Archetype::MapArchetype => {
                MapArchetype::inactive_from_entity_id(ctx, self.id).map(|a| a.activate(ctx));
            }
            Archetype::PathArchetype => {
                PathArchetype::inactive_from_entity_id(ctx, self.id).map(|a| a.activate(ctx));
            }
            Archetype::RoomArchetype => {
                RoomArchetype::inactive_from_entity_id(ctx, self.id).map(|a| a.activate(ctx));
            }
        };
        self
    }
    fn deactivate(self, ctx: &ReducerContext) -> Self {
        match self.archetype {
            Archetype::ActorArchetype => {
                ActorArchetype::from_entity_id(ctx, self.id).map(|a| a.deactivate(ctx));
            }
            Archetype::AllegianceArchetype => {
                AllegianceArchetype::from_entity_id(ctx, self.id).map(|a| a.deactivate(ctx));
            }
            Archetype::MapArchetype => {
                MapArchetype::from_entity_id(ctx, self.id).map(|a| a.deactivate(ctx));
            }
            Archetype::PathArchetype => {
                PathArchetype::from_entity_id(ctx, self.id).map(|a| a.deactivate(ctx));
            }
            Archetype::RoomArchetype => {
                RoomArchetype::from_entity_id(ctx, self.id).map(|a| a.deactivate(ctx));
            }
        };
        self
    }
}

#[allow(dead_code)]
pub trait StatBlockApplier {
    fn apply_stat_block(self, stat_block: StatBlock) -> Self;
}

impl<
        T: ActionsComponentEntity
            + AppearanceFeaturesComponentEntity
            + AttackComponentEntity
            + EpComponentEntity
            + HpComponentEntity,
    > StatBlockApplier for T
{
    fn apply_stat_block(mut self, stat_block: StatBlock) -> Self {
        let StatBlock {
            additive_action_ids,
            appearance_feature_ids,
            attack,
            defense,
            mep,
            mhp,
            subtractive_action_ids: _, // TODO Perform subtraction.
        } = stat_block;

        self.mut_actions().action_ids = additive_action_ids;
        self.mut_appearance_features().appearance_feature_ids = appearance_feature_ids;
        self.mut_attack().attack = attack;
        self.mut_ep().mep = mep;
        self.mut_hp().mhp = mhp;
        self.mut_hp().defense = defense;

        self
    }
}

pub trait RngSeeded {
    fn get_rng(&self) -> StdRng;
}

impl<T: RngSeedComponentEntity> RngSeeded for T {
    fn get_rng(&self) -> StdRng {
        StdRng::seed_from_u64(self.rng_seed().rng_seed)
    }
}

#[entity(table = actor_archetypes)]
#[table(name = actor_archetypes, public)]
#[table(name = inactive_actor_archetypes, public)]
#[derive(Debug, Clone, Default, Builder)]
pub struct ActorArchetype {
    #[primary_key]
    pub entity_id: EntityId,
    #[component]
    pub action_state: ActionStateComponent,
    #[component]
    pub actions: ActionsComponent,
    #[component]
    pub allegiance: AllegianceComponent,
    #[component]
    pub appearance_features: AppearanceFeaturesComponent,
    #[component]
    pub attack: AttackComponent,
    #[component]
    pub baseline: BaselineComponent,
    #[component]
    pub ep: EpComponent,
    #[component]
    pub hp: HpComponent,
    #[component]
    pub location: LocationComponent,
    #[component]
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
            actions: ActionsComponent { action_ids: vec![] },
            action_state: ActionStateComponent {
                action_state: None,
                sequence_index: 0,
                queued_action_state: None,
            },
            allegiance: AllegianceComponent {
                allegiance_entity_id,
            },
            appearance_features: AppearanceFeaturesComponent {
                appearance_feature_ids: vec![],
            },
            attack: AttackComponent { attack: 5 },
            baseline: BaselineComponent { baseline_id },
            ep: EpComponent { ep: 5, mep: 5 },
            hp: HpComponent {
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
                trait_ids,
                stat_block_cache: StatBlock::default(),
            },
        }
    }
}

#[entity(table = allegiance_archetypes)]
#[table(name = allegiance_archetypes, public)]
#[table(name = inactive_allegiance_archetypes, public)]
#[derive(Debug, Clone, Builder)]
pub struct AllegianceArchetype {
    #[primary_key]
    pub entity_id: EntityId,
}

impl AllegianceArchetype {
    pub fn new() -> Self {
        Self { entity_id: 0 }
    }
}

#[entity(table = map_archetypes)]
#[table(name = map_archetypes, public)]
#[table(name = inactive_map_archetypes, public)]
#[derive(Debug, Clone, Builder)]
pub struct MapArchetype {
    #[primary_key]
    pub entity_id: EntityId,
    #[component]
    pub map: MapComponent,
    #[component]
    pub rng_seed: RngSeedComponent,
}

pub struct MapGeneratorResult {
    pub rooms: Vec<RoomArchetype>,
}

pub trait MapGenerator {
    fn generate(&self, ctx: &ReducerContext) -> MapGeneratorResult;
}

impl<T: WithEntityId + RngSeedComponentEntity + MapComponentEntity> MapGenerator for T {
    fn generate(&self, ctx: &ReducerContext) -> MapGeneratorResult {
        let map = self.map();
        let af_ctx = AppearanceFeatureContext::new(ctx);
        let mut rng = self.get_rng();
        let total_room_count = map.extra_room_count + map.main_room_count;
        let rooms: Vec<RoomArchetype> = (0..total_room_count)
            .map(|_| RoomArchetype::new(af_ctx.by_texts(&["room"]), self.entity_id()))
            .collect();

        for i in 0..(map.main_room_count as usize - 1) {
            let a = &rooms[i];
            let b = &rooms[i + 1];
            PathArchetype::new(af_ctx.by_texts(&["path"]), a.entity_id, b.entity_id).insert(ctx);
            PathArchetype::new(af_ctx.by_texts(&["path"]), b.entity_id, a.entity_id).insert(ctx);
        }

        for i in (map.main_room_count as u32)..(total_room_count as u32) {
            let a = &rooms[i as usize];
            let b = &rooms[(rng.next_u32() % i) as usize];
            PathArchetype::new(af_ctx.by_texts(&["path"]), a.entity_id, b.entity_id).insert(ctx);
            PathArchetype::new(af_ctx.by_texts(&["path"]), b.entity_id, a.entity_id).insert(ctx);
        }

        MapGeneratorResult { rooms }
    }
}

#[entity(table = path_archetypes)]
#[table(name = path_archetypes, public)]
#[table(name = inactive_path_archetypes, public)]
#[derive(Debug, Clone, Builder)]
pub struct PathArchetype {
    #[primary_key]
    pub entity_id: EntityId,
    #[component]
    pub appearance_features: AppearanceFeaturesComponent,
    #[component]
    pub location: LocationComponent,
    #[component]
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
                appearance_feature_ids,
            },
            location: LocationComponent {
                entity_id: 0,
                location_entity_id,
            },
            path: PathComponent {
                destination_entity_id,
            },
        }
    }
}

#[entity(table = room_archetypes)]
#[table(name = room_archetypes, public)]
#[table(name = inactive_room_archetypes, public)]
#[derive(Debug, Clone, Builder)]
pub struct RoomArchetype {
    #[primary_key]
    pub entity_id: EntityId,
    #[component]
    pub appearance_features: AppearanceFeaturesComponent,
    #[component]
    pub location_map: LocationMapComponent,
}

impl RoomArchetype {
    pub fn new(appearance_feature_ids: Vec<u64>, map_entity_id: EntityId) -> Self {
        Self {
            entity_id: 0,
            appearance_features: AppearanceFeaturesComponent {
                appearance_feature_ids,
            },
            location_map: LocationMapComponent { map_entity_id },
        }
    }
}
