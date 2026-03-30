use crate::{action::ActionId, ecs_extension::EcsExtension, stat_block::StatBlock};
use ecs::{entity, WithEcs};
use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    Identity, ReducerContext, SpacetimeType, Timestamp,
};

entity!(
    #[struct_attrs]
    #[derive(Debug, Clone)]
    struct StructAttrs;

    type EntityId = u64;

    #[entity(table = entities)]
    pub struct Entity {
        entity_id: EntityId,
    }

    #[blob(table = entity_blobs)]
    pub struct EntityBlob;

    #[component(name in name_components)]
    struct NameComponent {
        #[unique]
        pub name: String,
    }

    #[component(location in location_components)]
    struct LocationComponent {
        #[index(btree)]
        pub location_entity_id: EntityId,
    }

    #[component(path in path_components)]
    struct PathComponent {
        #[index(btree)]
        pub destination_entity_id: EntityId,
    }

    #[component(allegiance in allegiance_components)]
    struct AllegianceComponent {
        #[index(btree)]
        pub allegiance_entity_id: EntityId,
    }

    #[component(baseline in baseline_components)]
    struct BaselineComponent {
        pub baseline_id: u32,
    }

    #[component(traits in traits_components)]
    struct TraitsComponent {
        pub trait_ids: Vec<u32>,
    }

    // TODO Add StatBlock caches for equipment and status effects.
    #[component(
      traits_stat_block_cache in traits_stat_block_cache_components,
    )]
    struct StatBlockCacheComponent {
        pub stat_block: StatBlock,
    }

    // TODO Equipment and Status Effects
    #[component(
      traits_stat_block_dirty_flag in traits_stat_block_dirty_flag_components,
      total_stat_block_dirty_flag in total_stat_block_dirty_flag_components,
    )]
    struct FlagComponent {}

    #[component(attack in attack_components)]
    struct AttackComponent {
        pub attack: i32,
    }

    #[component(hp in hp_components)]
    struct HpComponent {
        pub hp: i32,
        pub mhp: i32,
        pub defense: i32,
        pub accumulated_damage: i32,
        pub accumulated_healing: i32,
    }

    #[component(ep in ep_components)]
    struct EpComponent {
        pub ep: i32,
        pub mep: i32,
    }

    #[component(player_controller in player_controller_components)]
    struct PlayerControllerComponent {
        #[unique]
        pub identity: Identity,
    }

    #[component(
      action_state in action_state_components,
      queued_action_state in queued_action_state_components,
    )]
    struct ActionStateComponent {
        pub target_entity_id: EntityId,
        pub action_id: ActionId,
        pub sequence_index: i32,
    }

    #[component(actions in actions_components)]
    struct ActionsComponent {
        pub action_ids: Vec<ActionId>,
    }

    #[derive(Debug, Clone, SpacetimeType)]
    pub struct ActionHotkey {
        pub action_id: ActionId,
        pub character_code: u32,
    }

    #[component(action_hotkeys in action_hotkeys_components)]
    struct ActionHotkeysComponent {
        pub action_hotkeys: Vec<ActionHotkey>,
    }

    #[component(entity_prominence in entity_prominence_components)]
    struct EntityProminenceComponent {
        pub prominence: i32,
    }

    #[component(
      entity_deletion_timer in entity_deletion_timer_components,
      player_deactivation_timer in player_deactivation_timer_components,
    )]
    struct TimerComponent {
        pub timestamp: Timestamp,
    }

    #[component(rng_seed in rng_seed_components)]
    struct RngSeedComponent {
        pub rng_seed: u64,
    }

    #[component(location_map in location_map_components)]
    struct LocationMapComponent {
        pub map_entity_id: EntityId,
    }

    #[derive(Debug, Clone, SpacetimeType)]
    pub enum MapLayout {
        Path,
        Hub,
    }

    #[component(
      realized_map in realized_map_components,
      unrealized_map in unrealized_map_components,
    )]
    struct MapComponent {
        pub map_theme_id: u64,
        pub map_layout: MapLayout,
        pub extra_room_count: u8,
        pub main_room_count: u8,
        pub loop_count: u8,
    }

    #[component(appearance_features in appearance_features_components)]
    struct AppearanceFeaturesComponent {
        pub appearance_feature_indexes: Vec<u32>,
    }
);

pub trait GetRng {
    fn get_rng(&self) -> StdRng;
}

impl<T: rng_seed_component::Some> GetRng for T {
    fn get_rng(&self) -> StdRng {
        StdRng::seed_from_u64(self.rng_seed().rng_seed)
    }
}

#[allow(dead_code)]
pub struct MapGenerationResult {
    pub room_ids: Vec<u64>,
}

#[allow(dead_code)]
pub trait MapGenerator {
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult;
}

impl<'a, T: WithEntityHandle<'a> + unrealized_map_component::Some + rng_seed_component::Some>
    MapGenerator for T
{
    fn generate(&self, ctx: &ReducerContext) -> MapGenerationResult {
        let map = self.unrealized_map();
        let mut rng = self.get_rng();
        let total_room_count = map.extra_room_count + map.main_room_count;
        let room_handles: Vec<EntityHandle> = (0..total_room_count)
            .map(|_| {
                ctx.ecs() // WIP Use entity blobs to initialize rooms and paths.
                    .new_room(vec![], self.entity_id())
            })
            .collect();

        for i in 0..(map.main_room_count as usize - 1) {
            let a = &room_handles[i];
            let b = &room_handles[i + 1];
            ctx.ecs().new_path(vec![], a.entity_id, b.entity_id);
            ctx.ecs().new_path(vec![], b.entity_id, a.entity_id);
        }

        for i in (map.main_room_count as u32)..(total_room_count as u32) {
            let a = &room_handles[i as usize];
            let b = &room_handles[(rng.next_u32() % i) as usize];
            ctx.ecs().new_path(vec![], a.entity_id, b.entity_id);
            ctx.ecs().new_path(vec![], b.entity_id, a.entity_id);
        }

        MapGenerationResult {
            room_ids: room_handles.iter().map(|h| h.entity_id).collect(),
        }
    }
}
