use crate::{
    action::ActionId,
    asset::stat_block::StatBlock,
    item::{ItemRef, StanceLoadout},
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

    // What a breakable leaves behind: on destruction (hp exhausted,
    // neither player nor enemy controller), the entity's contents SPILL
    // into its room, its appearance becomes these remains (rubble,
    // ceramic shards, scrap wood — decoration for now), and its hp
    // component goes: debris is not attackable and never deleted, so its
    // name survives in narration like any corpse.
    #[component(remains in remains_components)]
    struct RemainsComponent {
        pub appearance_feature_ids: Vec<u32>,
    }

    // The DEFAULT wielded set: what the hands hold whenever the active
    // stance's loadout assigns NO armaments — a stance assignment is an
    // OVERRIDE of this default, never a requirement. Edited by the
    // equip/unequip item actions and take's auto-wield ("the item goes to
    // the default slot"); resolution into actual hands lives in
    // resolved_armament_ids.
    #[component(default_armaments in default_armaments_components)]
    struct DefaultArmamentsComponent {
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
        pub assignments: Vec<StanceLoadout>,
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
      quest_stat_block_cache in quest_stat_block_cache_components,
      dirties(total_stat_block_dirty_flag),
    )]
    struct StatBlockCacheComponent {
        pub stat_block: StatBlock,
    }

    // TODO Equipment and Status Effects
    #[component(
      traits_stat_block_dirty_flag in traits_stat_block_dirty_flag_components,
      equipment_stat_block_dirty_flag in equipment_stat_block_dirty_flag_components,
      status_stat_block_dirty_flag in status_stat_block_dirty_flag_components,
      quest_stat_block_dirty_flag in quest_stat_block_dirty_flag_components,
      total_stat_block_dirty_flag in total_stat_block_dirty_flag_components,
      checkpoint_object in checkpoint_object_components,
      // On a map INSTANCE entity: its turn has not come (some player
      // there still owes an action). Derived once per tick by
      // turn_pause_system; the action systems and the client's
      // waiting-overlay both read it.
      turn_paused in turn_paused_components,
    )]
    struct FlagComponent {}

    // Where this entity wakes from the death-trance. NEVER a concrete room
    // entity — the destination map may not be generated yet — but a map
    // ASSET plus which of that map's generated checkpoints; respawn (and,
    // later, teleportation) resolves it, generating the map on demand.
    #[component(checkpoint in checkpoint_components)]
    struct CheckpointComponent {
        pub location_map_id: u32,
        pub checkpoint_index: u32,
    }

    // A generated map instance's identity: which map ASSET it realizes.
    #[component(map_instance in map_instance_components)]
    struct MapInstanceComponent {
        pub location_map_id: u32,
    }

    // The generated checkpoint rooms of a map instance, in placement order —
    // what a CheckpointComponent's index selects.
    #[component(map_checkpoints in map_checkpoints_components)]
    struct MapCheckpointsComponent {
        pub checkpoint_room_entity_ids: Vec<EntityId>,
    }

    // A map instance's generated rooms, in generation order — what a
    // ConnectionAnchor resolves against.
    #[component(map_rooms in map_rooms_components)]
    struct MapRoomsComponent {
        pub main_room_entity_ids: Vec<EntityId>,
        pub extra_room_entity_ids: Vec<EntityId>,
    }

    // On an anchor ROOM: cross-map connections not yet materialized. A
    // player standing here demands the destination map — generating it if
    // needed — and the connecting path appears.
    #[component(pending_connections in pending_connections_components)]
    struct PendingConnectionsComponent {
        pub connection_ids: Vec<u32>,
    }

    // On a checkpoint OBJECT: the abstract destination attuning to it
    // binds (its own map + index).
    #[component(checkpoint_binding in checkpoint_binding_components)]
    struct CheckpointBindingComponent {
        pub location_map_id: u32,
        pub checkpoint_index: u32,
    }

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

    // The APPLIED total stat block, stored whole: rigid stats (morale,
    // size, and future property reads like pickup gating) are read straight
    // from here instead of each getting its own component. Fluid values
    // (hp, ep) still live in their own components; the total only moves
    // their ceilings.
    #[component(total_stat_block in total_stat_block_components)]
    struct TotalStatBlockComponent {
        pub stat_block: StatBlock,
    }

    // FEAR: the first real status effect. Holds the HIGHEST intimidation
    // received; its presence is what forces (and holds) the cower stance.
    // Overcome by raising effective morale above it, then standing up.
    #[component(fear_status in fear_status_components)]
    struct FearStatusComponent {
        pub intimidation: i16,
    }

    // COURAGE: rally's status effect, sized dynamically (EP spent 1:1) to
    // lift effective morale just past the fear. Folds into the total stat
    // block through the status cache, so rigid morale absorbs it. Cleared,
    // with the fear, on standing up.
    #[component(courage_status in courage_status_components, dirties(status_stat_block_dirty_flag))]
    struct CourageStatusComponent {
        pub morale: i16,
    }

    // BRACED: dive's status effect — bonus defense, folded through the
    // status cache exactly like courage. Cleared on the next stance change.
    #[component(braced_status in braced_status_components, dirties(status_stat_block_dirty_flag))]
    struct BracedStatusComponent {
        pub defense: i16,
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
      respawn_timer in respawn_timer_components,
      map_cleanup_timer in map_cleanup_timer_components,
      // When a PLAYER last became actionless (no active or queued action);
      // present only while actionless. 30+ seconds marks the player idle
      // for the turn guard (see turn.rs).
      actionless_since in actionless_since_components,
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
