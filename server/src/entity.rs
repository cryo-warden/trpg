use crate::{
    action::ActionId,
    asset::stat_block::StatBlock,
    item::{ItemRef, StanceArmaments},
};
use ecs::entity;
use spacetimedb::Timestamp;

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

    #[registry(table = named_entities)]
    pub struct NamedEntity;

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

    #[component(baseline in baseline_components, dirties(total_stat_block_dirty_flag))]
    struct BaselineComponent {
        pub baseline_id: u32,
    }

    #[component(traits in traits_components, dirties(traits_stat_block_dirty_flag))]
    struct TraitsComponent {
        pub trait_ids: Vec<u32>,
    }

    // The exclusive posture the entity fights from: its stance's stat block
    // joins the total (including granted action_ids), so swapping recomputes
    // stats and available actions through the ordinary dirty-flag path.
    #[component(active_stance in active_stance_components, dirties(total_stat_block_dirty_flag))]
    struct ActiveStanceComponent {
        pub stance_id: u32,
    }

    // Wielded armaments; their stat blocks merge through the equipment cache
    // exactly as traits merge through theirs. For a player with stance
    // loadouts this is DERIVED (rewritten on stance swap or assignment);
    // NPCs author it directly via blobs.
    #[component(equipment in equipment_components, dirties(equipment_stat_block_dirty_flag))]
    struct EquipmentComponent {
        pub armament_ids: Vec<u32>,
    }

    // The single global clothing/armor slot, applied across every stance.
    #[component(armor in armor_components, dirties(equipment_stat_block_dirty_flag))]
    struct ArmorComponent {
        pub armor_id: u32,
    }

    // Up to four relics (enforced at the reducer), applied across every
    // stance.
    #[component(relics in relics_components, dirties(equipment_stat_block_dirty_flag))]
    struct RelicsComponent {
        pub relic_ids: Vec<u32>,
    }

    // The player's per-stance armament assignments (asset ids, validated by
    // counting owned items at assignment time). Never authored by blobs; no
    // dirty flag because assignments only take effect when a reducer
    // rewrites EquipmentComponent (on assignment or stance swap).
    #[component(stance_loadouts in stance_loadouts_components)]
    struct StanceLoadoutsComponent {
        pub assignments: Vec<StanceArmaments>,
    }

    // An entity that IS an item: takeable, droppable, and referenced by the
    // loadout menu through its gear asset.
    #[component(item in item_components)]
    struct ItemComponent {
        pub item_ref: ItemRef,
    }

    #[component(
      equipment_stat_block_cache in equipment_stat_block_cache_components,
      status_stat_block_cache in status_stat_block_cache_components,
      traits_stat_block_cache in traits_stat_block_cache_components,
      dirties(total_stat_block_dirty_flag),
    )]
    struct StatBlockCacheComponent {
        pub stat_block: StatBlock,
    }

    // TODO Equipment and Status Effects
    #[component(
      traits_stat_block_dirty_flag in traits_stat_block_dirty_flag_components,
      equipment_stat_block_dirty_flag in equipment_stat_block_dirty_flag_components,
      total_stat_block_dirty_flag in total_stat_block_dirty_flag_components,
    )]
    struct FlagComponent {}

    #[component(attack in attack_components)]
    struct AttackComponent {
        pub attack: i8,
    }

    #[component(hp in hp_components)]
    struct HpComponent {
        pub hp: i16,
        pub mhp: i16,
        pub defense: i8,
        pub accumulated_damage: i16,
        pub accumulated_healing: i16,
    }

    #[component(ep in ep_components)]
    struct EpComponent {
        pub ep: i16,
        pub mep: i16,
    }

    #[component(player_controller in player_controller_components)]
    struct PlayerControllerComponent {
        // The owning ACCOUNT (durable principal), never a connection
        // identity: identities resolve to accounts at the reducer boundary.
        // Deliberately a raw u64, not EntityId — accounts are not entities,
        // and this must not become an entity-reference selector in blobs.
        #[unique]
        pub account_id: u64,
    }

    #[component(enemy_controller in enemy_controller_components)]
    struct EnemyControllerComponent {
        // TODO Add calibration properties?
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

    #[component(pinned_actions in pinned_actions_components)]
    struct PinnedActionsComponent {
        // Ordered: the position in the bar is the automatically assigned
        // numeric hotkey (1..9, then 0).
        pub action_ids: Vec<ActionId>,
    }

    #[component(
      entity_deletion_timer in entity_deletion_timer_components,
      player_deactivation_timer in player_deactivation_timer_components,
    )]
    struct TimerComponent {
        pub timestamp: Timestamp,
    }

    #[component(location_map in location_map_components)]
    struct LocationMapComponent {
        pub location_map_entity_id: EntityId,
    }

    #[component(appearance_features in appearance_features_components)]
    struct AppearanceFeaturesComponent {
        pub appearance_feature_indexes: Vec<u32>,
    }
);
