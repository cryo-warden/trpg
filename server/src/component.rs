use archetype::component;
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

#[derive(Debug, Default, Clone, SpacetimeType)]
pub struct ActionHotkey {
    pub action_id: u64,
    pub character_code: u32,
}

#[table(name = players, public)]
#[derive(Debug, Default, Clone)]
pub struct Player {
    #[primary_key]
    pub identity: Identity,
    #[unique]
    pub entity_id: EntityId,
    pub action_hotkeys: Vec<ActionHotkey>,
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
            action_hotkeys: vec![],
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
    pub entity_id: EntityId,
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
    pub entity_id: EntityId,
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

#[table(name = entity_names, public)]
#[derive(Debug, Default, Clone)]
pub struct EntityName {
    #[primary_key]
    pub entity_id: EntityId,
    #[unique]
    pub name: String,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(location)]
pub struct LocationComponent {
    pub location_entity_id: EntityId,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(path)]
pub struct PathComponent {
    pub destination_entity_id: EntityId,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(allegiance)]
pub struct AllegianceComponent {
    pub allegiance_entity_id: EntityId,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(baseline)]
pub struct BaselineComponent {
    pub baseline_id: u64,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(traits)]
pub struct TraitsComponent {
    pub trait_ids: Vec<u64>,
    pub stat_block_cache: StatBlock,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(attack)]
pub struct AttackComponent {
    pub attack: i32,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(hp)]
pub struct HpComponent {
    pub hp: i32,
    pub mhp: i32,
    pub defense: i32,
    pub accumulated_damage: i32,
    pub accumulated_healing: i32,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(ep)]
pub struct EpComponent {
    pub ep: i32,
    pub mep: i32,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
pub struct ActionState {
    pub target_entity_id: EntityId,
    pub action_id: u64,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(action_state)]
pub struct ActionStateComponent {
    pub sequence_index: i32,
    pub action_state: Option<ActionState>,
    pub queued_action_state: Option<ActionState>,
}

impl ActionStateComponent {
    pub fn set_queued_action_state(&mut self, action_id: u64, target_entity_id: EntityId) {
        self.queued_action_state = Some(ActionState {
            target_entity_id,
            action_id,
        });
    }
    pub fn shift_queued_action_state(&mut self) {
        self.sequence_index = 0;
        self.action_state = self.queued_action_state.clone();
        self.queued_action_state = None;
    }
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(actions)]
pub struct ActionsComponent {
    pub action_ids: Vec<u64>,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
pub struct ActionOption {
    pub action_id: u64,
    pub target_entity_id: EntityId,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(rng_seed)]
pub struct RngSeedComponent {
    pub rng_seed: u64,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(location_map)]
pub struct LocationMapComponent {
    pub map_entity_id: EntityId,
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

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(map)]
pub struct MapComponent {
    pub map_theme_id: u64,
    pub map_layout: MapLayout,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
}

// WIP Rename and move to show association with Player.
#[table(name = observer_components, public)]
#[derive(Debug, Default, Clone)]
pub struct ObserverComponent {
    #[index(btree)]
    pub entity_id: EntityId,
    #[index(btree)]
    pub observable_event_id: u64,
}

#[derive(Debug, Default, Clone, SpacetimeType)]
#[component(appearance_features)]
pub struct AppearanceFeaturesComponent {
    pub appearance_feature_ids: Vec<u64>,
}
