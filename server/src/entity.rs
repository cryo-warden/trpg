use crate::{
    action::ActionId,
    asset::stat_block::StatBlock,
    item::{ItemRef, StanceLoadout},
};
use ecs::entity;
use spacetimedb::Timestamp;

/// How something occupies its location: on its EXTERIOR — the visible
/// surface, where outdoor rooms sit on the world and wielded gear rides
/// a body — or in its INTERIOR (room occupants, pocketed items,
/// container contents). (id, Exterior) and (id, Interior) are DIFFERENT
/// locations to every co-location comparison; inventory checks match
/// the id alone. Visibility recurses upward through Exterior edges (the
/// sky shows outdoors), and weather will reach exactly what the sky
/// sees.
#[derive(Debug, Clone, Copy, PartialEq, Eq, spacetimedb::SpacetimeType)]
pub enum LocationKind {
    Exterior,
    Interior,
}

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

    // A location is a VALUE PAIR, not a bare pointer: the target entity
    // plus HOW it is occupied (see LocationKind). Same id, different
    // kind = different location.
    #[component(location in location_components)]
    struct LocationComponent {
        #[index(btree)]
        pub location_entity_id: EntityId,
        pub kind: crate::entity::LocationKind,
    }

    // The destination is a LOCATION PAIR, field-mirroring
    // LocationComponent (the btree over the raw id keeps containment
    // and cleanup queries indexable): crossing a path copies this pair
    // verbatim into the traveler's location — the path decides where
    // AND how you arrive.
    #[component(path in path_components)]
    struct PathComponent {
        #[index(btree)]
        pub destination_entity_id: EntityId,
        pub destination_kind: crate::entity::LocationKind,
    }

    // On a PATH entity: impassable while the referenced breakable still
    // stands (still has hp). Hidden side rooms and one-way shortcuts both
    // hang off this — smashing the blocker opens the way, permanently.
    #[component(path_blocker in path_blocker_components)]
    struct PathBlockerComponent {
        #[index(btree)]
        pub blocker_entity_id: EntityId,
    }

    // Paired entities share ONE fate. The two directions of a crossing are
    // one physical thing: a blow to either lands on both, and destroying one
    // collapses the other — a crack smashed from one side is a cave-in on
    // both. hp_share_system mirrors each side's per-tick HP delta onto the
    // other, so the pair takes every blow (and every heal) together. (Both
    // partners carry it, pointing at each other.)
    #[component(hp_share in hp_share_components)]
    struct HpShareComponent {
        #[index(btree)]
        pub partner_entity_id: EntityId,
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
    // exactly as traits merge through theirs. THE CANONICAL worn/wielded
    // reality — the one representation stats derive from. The various
    // CONFIGURATIONS (default armaments, stance loadouts, the armor and
    // relics choices) are intent; the reconciliation system detects
    // divergence and forces the re-arm action, while intentional acts
    // (stance changes, equip/unequip) converge immediately themselves.
    // Authored entities are born converged (blobs fill this alongside
    // their configs).
    #[component(equipment in equipment_components, dirties(equipment_stat_block_dirty_flag))]
    struct EquipmentComponent {
        pub armament_ids: Vec<u32>,
        pub worn_armor_id: Option<u32>,
        pub worn_relic_ids: Vec<u32>,
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

    // CONFIGURATION: the chosen clothing/armor slot, applied across every
    // stance. Stats never read this — the worn reality lives on
    // EquipmentComponent, converged by the reconciliation system.
    #[component(armor in armor_components)]
    struct ArmorComponent {
        pub armor_id: u32,
    }

    // CONFIGURATION: up to four chosen relics (enforced at the reducer),
    // applied across every stance. Same convergence as armor.
    #[component(relics in relics_components)]
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
      // On a CONTAINER: it has been opened — its contents are revealed
      // and takeable while they stay inside, intact. Set by the Open
      // effect; there is no closing (yet).
      open in open_components,
      // The active stance was FORCED (intimidation's cower, dive's
      // prone): the equipment reconciliation system skips auto-equip
      // while this stands — a forced posture never re-arms the hands.
      // Intentional stance changes remove it (and re-arm immediately).
      stance_forced in stance_forced_components,
      // The action queue changed since the last validation sweep: set by
      // every ActionStateComponent mutation (see its dirties), consumed
      // by action_validation_system.
      action_queue_dirty in action_queue_dirty_components,
      // An NPC corpse already processed by the death system: its Died
      // narration fired and its states were shed exactly once. Players
      // gate on their respawn timer instead (revival must not be
      // blocked by a permanent flag).
      perished in perished_components,
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

    // OPT-IN to variety and differentiation: points at a reusable trait
    // PALETTE (see TraitPalette) — the set of traits eligible to be drawn onto
    // this entity. At spawn, co-located members sharing a palette draw DISTINCT
    // trait subsets, so a pack reads as "a brawny wolf, a rangy wolf, a scarred
    // wolf" instead of "wolf 1-4". An explicit per-entity opt-in so players and
    // unique NPCs are never differentiated by accident.
    #[component(differentiable in differentiable_components)]
    struct DifferentiableComponent {
        pub trait_palette_id: u32,
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

    // On a boss-claim spawn: felling the LAST living carrier of this
    // (quest, index) pair in the same map instance drops that quest
    // item — one per player present — into the room (the blob lives on
    // the map's claim; an EntityBlob here would make EntityBlob
    // recursive). Consumed on death: the one-shot latch that keeps a
    // lingering corpse from re-dropping every tick.
    #[component(defeat_drop in defeat_drop_components)]
    struct DefeatDropComponent {
        pub quest_id: u32,
        pub index: u32,
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

    // The ACTIVE action alone; what waits lives in ActionQueueComponent.
    // Every mutation flows through these generated methods — the ONE
    // fixed path — and each dirties the validation flag, so the
    // action-validation system only examines entities whose queue
    // actually changed.
    #[component(
      action_state in action_state_components,
      dirties(action_queue_dirty),
    )]
    struct ActionStateComponent {
        pub target_entity_id: EntityId,
        pub action_id: ActionId,
        pub sequence_index: i32,
    }

    // The ORDERED action queue: automatic (system-forced) entries at the
    // front, then at most one manual entry (see QueuedAction). Mutations
    // flow through the enqueue/shift extension methods and dirty the
    // validation flag like the active state does.
    #[component(action_queue in action_queue_components, dirties(action_queue_dirty))]
    struct ActionQueueComponent {
        pub entries: Vec<crate::action::QueuedAction>,
    }

    #[component(
      actions in actions_components,
      // The INTERACTIVE surface of an object: actions this entity OFFERS
      // to anyone co-located, independent of what the actor knows —
      // opening a chest, dumping a sack; later doors, levers, attunement.
      // Which interactions a thing supports is explicit data here, never
      // inferred from its appearance.
      offered_actions in offered_actions_components,
      // The DEFAULT action bar, mirroring the default armament slot:
      // what a stance change pins when the adopted stance carries no bar
      // assignment of its own. Configured in the equip menu.
      default_actions in default_actions_components,
    )]
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
