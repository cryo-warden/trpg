use archetype::flag_component;
use archetype::timer_component;
use spacetimedb::table;
use spacetimedb::Identity;
use spacetimedb::ReducerContext;
use spacetimedb::SpacetimeType;
use spacetimedb::Table;
use spacetimedb::Timestamp;

use crate::entity::EntityId;
use crate::stat_block::StatBlock;

#[table(name = players, public)]
#[derive(Debug, Default, Clone)]
pub struct Player {
    #[primary_key]
    pub identity: Identity,
    pub entity_id: u64,
}

#[allow(dead_code)]
impl Player {
    pub fn find(ctx: &ReducerContext) -> Option<Self> {
        ctx.db.players().identity().find(ctx.sender)
    }
    pub fn insert(ctx: &ReducerContext, entity_id: EntityId) -> Self {
        ctx.db.players().insert(Player {
            identity: ctx.sender,
            entity_id,
        })
    }
}

// TODO Equipment and Status Effects
#[table(name = traits_stat_block_dirty_flag_components, public)]
#[flag_component(traits_stat_block_dirty)]
#[table(name = total_stat_block_dirty_flag_components, public)]
#[flag_component(total_stat_block_dirty)]
#[derive(Debug, Default, Clone)]
pub struct FlagComponent {
    #[primary_key]
    pub entity_id: u64,
}

#[allow(dead_code)]
impl FlagComponent {
    pub fn insert(ctx: &ReducerContext, entity_id: EntityId) {
        ctx.db
            .traits_stat_block_dirty_flag_components()
            .insert(FlagComponent { entity_id });
    }
}

#[table(name = entity_deactivation_timer_components, public)]
#[timer_component(entity_deactivation)]
#[derive(Debug, Clone)]
pub struct TimerComponent {
    #[primary_key]
    pub entity_id: u64,
    pub timestamp: Timestamp,
}

impl Default for TimerComponent {
    fn default() -> Self {
        Self {
            entity_id: 0,
            timestamp: Timestamp::from_micros_since_unix_epoch(0),
        }
    }
}

#[table(name = name_components, public)]
#[derive(Debug, Default, Clone)]
pub struct NameComponent {
    #[primary_key]
    pub entity_id: u64,
    #[unique]
    pub name: String,
}

#[table(name = player_controller_components, public)]
#[derive(Debug, Default, Clone)]
pub struct PlayerControllerComponent {
    #[primary_key]
    pub entity_id: u64,
    #[unique]
    pub identity: Identity,
}

#[table(name = location_components, public)]
#[derive(Debug, Default, Clone)]
pub struct LocationComponent {
    #[primary_key]
    pub entity_id: u64,
    #[index(btree)]
    pub location_entity_id: u64,
}

#[table(name = path_components, public)]
#[derive(Debug, Clone)]
pub struct PathComponent {
    #[primary_key]
    pub entity_id: u64,
    #[index(btree)]
    pub destination_entity_id: u64,
}

#[table(name = allegiance_components, public)]
#[derive(Debug, Default, Clone)]
pub struct AllegianceComponent {
    #[primary_key]
    pub entity_id: u64,
    #[index(btree)]
    pub allegiance_entity_id: u64,
}

#[table(name = baseline_components, public)]
#[derive(Debug, Default, Clone)]
pub struct BaselineComponent {
    #[primary_key]
    pub entity_id: u64,
    pub baseline_id: u64,
}

#[table(name = traits_components, public)]
#[derive(Debug, Default, Clone)]
pub struct TraitsComponent {
    #[primary_key]
    pub entity_id: u64,
    pub trait_ids: Vec<u64>,
}

// TODO Add StatBlock caches for equipment and status effects.
#[table(name = traits_stat_block_cache_components, public)]
#[derive(Debug, Default, Clone)]
pub struct StatBlockCacheComponent {
    #[primary_key]
    pub entity_id: u64,
    pub stat_block: StatBlock,
}

#[table(name = attack_components, public)]
#[derive(Debug, Default, Clone)]
pub struct AttackComponent {
    #[primary_key]
    pub entity_id: u64,
    pub attack: i32,
}

#[table(name = hp_components, public)]
#[derive(Debug, Default, Clone)]
pub struct HpComponent {
    #[primary_key]
    pub entity_id: u64,
    pub hp: i32,
    pub mhp: i32,
    pub defense: i32,
    pub accumulated_damage: i32,
    pub accumulated_healing: i32,
}

#[table(name = ep_components, public)]
#[derive(Debug, Default, Clone)]
pub struct EpComponent {
    #[primary_key]
    pub entity_id: u64,
    pub ep: i32,
    pub mep: i32,
}

#[table(name = target_components, public)]
#[derive(Debug, Default, Clone)]
pub struct TargetComponent {
    #[primary_key]
    pub entity_id: u64,
    pub target_entity_id: u64,
}

#[table(name = queued_action_state_components, public)]
#[table(name = action_state_components, public)]
#[derive(Debug, Default, Clone)]
pub struct ActionStateComponent {
    #[primary_key]
    pub entity_id: u64,
    pub target_entity_id: u64,
    pub action_id: u64,
    pub sequence_index: i32,
}

#[table(name = actions_components, public)]
#[derive(Debug, Default, Clone)]
pub struct ActionsComponent {
    #[primary_key]
    pub entity_id: u64,
    pub action_ids: Vec<u64>,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
pub struct ActionHotkey {
    pub action_id: u64,
    pub character_code: u32,
}

#[table(name = action_hotkeys_components, public)]
#[derive(Debug, Default, Clone)]
pub struct ActionHotkeysComponent {
    #[primary_key]
    pub entity_id: u64,
    pub action_hotkeys: Vec<ActionHotkey>,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
pub struct ActionOption {
    pub action_id: u64,
    pub target_entity_id: u64,
}

#[table(name = action_options_components, public)]
#[derive(Debug, Default, Clone)]
pub struct ActionOptionsComponent {
    #[primary_key]
    pub entity_id: u64,
    pub action_options: Vec<ActionOption>,
}

#[table(name = entity_prominence_components, public)]
#[derive(Debug, Default, Clone)]
pub struct EntityProminenceComponent {
    #[primary_key]
    pub entity_id: u64,
    pub prominence: i32,
}

#[table(name = rng_seed_components, public)]
#[derive(Debug, Default, Clone)]
pub struct RngSeedComponent {
    #[primary_key]
    pub entity_id: u64,
    pub rng_seed: u64,
}

#[table(name = location_map_components, public)]
#[derive(Debug, Default, Clone)]
pub struct LocationMapComponent {
    #[primary_key]
    pub entity_id: u64,
    pub map_entity_id: u64,
}

#[derive(Debug, Clone, SpacetimeType)]
pub enum MapLayout {
    Path,
    Hub,
}

impl Default for MapLayout {
    fn default() -> Self {
        MapLayout::Path
    }
}

#[table(name = realized_map_components, public)]
#[table(name = unrealized_map_components, public)]
#[derive(Debug, Default, Clone)]
pub struct MapComponent {
    #[primary_key]
    pub entity_id: u64,
    pub map_theme_id: u64,
    pub map_layout: MapLayout,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
}

#[table(name = observer_components, public)]
#[derive(Debug, Default, Clone)]
pub struct ObserverComponent {
    #[index(btree)]
    pub entity_id: u64,
    #[index(btree)]
    pub observable_event_id: u64,
}

#[table(name = appearance_features_components, public)]
#[derive(Debug, Default, Clone)]
pub struct AppearanceFeaturesComponent {
    #[primary_key]
    pub entity_id: u64,
    pub appearance_feature_ids: Vec<u64>,
}
