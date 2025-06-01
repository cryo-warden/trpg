use spacetimedb::table;
use spacetimedb::SpacetimeType;
use spacetimedb::Timestamp;

use spacetimedb::Identity;

#[table(name = name_components, public)]
#[derive(Debug, Clone)]
pub struct NameComponent {
    #[primary_key]
    pub entity_id: u64,
    #[unique]
    pub name: String,
}

#[table(name = location_components, public)]
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
pub struct AllegianceComponent {
    #[primary_key]
    pub entity_id: u64,
    #[index(btree)]
    pub allegiance_entity_id: u64,
}

#[table(name = baseline_components, public)]
#[derive(Debug, Clone)]
pub struct BaselineComponent {
    #[primary_key]
    pub entity_id: u64,
    pub baseline_id: u64,
}

#[table(name = traits_components, public)]
#[derive(Debug, Clone)]
pub struct TraitsComponent {
    #[primary_key]
    pub entity_id: u64,
    pub trait_ids: Vec<u64>,
}

#[table(name = attack_components, public)]
#[derive(Debug, Clone)]
pub struct AttackComponent {
    #[primary_key]
    pub entity_id: u64,
    pub attack: i32,
}

#[table(name = hp_components, public)]
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
pub struct EpComponent {
    #[primary_key]
    pub entity_id: u64,
    pub ep: i32,
    pub mep: i32,
}

#[table(name = player_controller_components, public)]
#[derive(Debug, Clone)]
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
#[derive(Debug, Clone)]
pub struct ActionStateComponent {
    #[primary_key]
    pub entity_id: u64,
    pub target_entity_id: u64,
    pub action_id: u64,
    pub sequence_index: i32,
}

#[table(name = actions_components, public)]
#[derive(Debug, Clone)]
pub struct ActionsComponent {
    #[primary_key]
    pub entity_id: u64,
    pub action_ids: Vec<u64>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionHotkey {
    pub action_id: u64,
    pub character_code: u32,
}

#[table(name = action_hotkeys_components, public)]
#[derive(Debug, Clone)]
pub struct ActionHotkeysComponent {
    #[primary_key]
    pub entity_id: u64,
    pub action_hotkeys: Vec<ActionHotkey>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionOption {
    pub action_id: u64,
    pub target_entity_id: u64,
}

#[table(name = action_options_components, public)]
#[derive(Debug, Clone)]
pub struct ActionOptionsComponent {
    #[primary_key]
    pub entity_id: u64,
    pub action_options: Vec<ActionOption>,
}

#[table(name = entity_prominence_components, public)]
#[derive(Debug, Clone)]
pub struct EntityProminenceComponent {
    #[primary_key]
    pub entity_id: u64,
    pub prominence: i32,
}

#[table(name = entity_deactivation_timer_components, public)]
#[derive(Debug, Clone)]
pub struct EntityDeactivationTimerComponent {
    #[primary_key]
    pub entity_id: u64,
    pub timestamp: Timestamp,
}
