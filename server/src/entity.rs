use crate::{
    action::ActionId,
    item::{ItemRef, StanceCustomization},
    stat_group::{AppearanceBlock, BodyCapacityBlock, ReadinessBlock, StatsBlock},
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

    // TRANSIENT (per-tick): the HP delta hp_share_system has ALREADY mirrored
    // onto this entity this tick. Its event-backed table clears itself every
    // transaction, so the mirror can stay idempotent — a re-run subtracts what
    // was already applied — without persisting anything or needing a reset.
    // This is the first user of the transient-component mechanism; generalize
    // from here.
    #[component(hp_share_applied in hp_share_applied_components, transient)]
    struct HpShareAppliedComponent {
        pub damage: i16,
        pub healing: i16,
    }

    #[component(allegiance in allegiance_components)]
    struct AllegianceComponent {
        #[index(btree)]
        pub allegiance_entity_id: EntityId,
    }

    // On a PLAYER: which party they belong to, NAMED BY ITS LEADER entity. A
    // lone player leads their own party (party_leader == self), so map instances
    // and every lookup key off one entity id — no "solo vs group" branch anywhere.
    // New players are created with party_leader = 0; party_leader_sanitation_system
    // enforces the invariant that a leader is always a live entity, repointing any
    // dangling leader (0, or one since cleaned up) at the member itself. The btree
    // answers "which players share leader L" for the map live-condition.
    #[component(party in party_components)]
    struct PartyComponent {
        #[index(btree)]
        pub party_leader: EntityId,
    }

    // The baseline is read LIVE from its asset row (never cached), so a
    // change to WHICH baseline an entity has must re-derive every group total
    // directly — and, because the baseline provides the body's own capacity
    // (the floor the equip gate stands on), the equipment computation too.
    #[component(baseline in baseline_components, dirties(stats_dirty_flag, appearance_dirty_flag, body_capacity_dirty_flag, readiness_dirty_flag, equipment_dirty_flag))]
    struct BaselineComponent {
        pub baseline_id: u32,
    }

    // A trait-set change re-folds the per-group traits caches (traits_dirty_flag
    // drives the fold); each cache then dirties only its own group total, so a
    // trait that touches only readiness never recomputes stats/appearance. The
    // fold's body-capacity cache is what re-gates equipment — the traits input
    // itself does not dirty equipment.
    #[component(traits in traits_components, dirties(traits_dirty_flag))]
    struct TraitsComponent {
        pub trait_ids: Vec<u32>,
    }

    // The exclusive posture the entity fights from: its stance's group blocks
    // are folded LIVE into the stats/readiness/body-capacity totals (a stance
    // provides no appearance), so swapping recomputes those totals — and the
    // derived action set — through the ordinary dirty-flag path. It also gates
    // equipment (a stance can reduce a capacity), so it dirties equipment too.
    #[component(active_stance in active_stance_components, dirties(stats_dirty_flag, readiness_dirty_flag, body_capacity_dirty_flag, equipment_dirty_flag))]
    struct ActiveStanceComponent {
        pub stance_id: u32,
    }

    // THE CANONICAL worn/wielded reality: the concrete item entities in hand
    // and worn (armaments + armor + relics, distinguished by each item's
    // ItemRef kind). The equipment cache sums every listed item's Equippable
    // stat block — the one representation stats derive from. The various
    // CONFIGURATIONS (default armaments, stance customizations, the armor and
    // relics choices — all ENTITY-id lists) are intent; the reconciliation
    // system detects divergence and forces the re-arm action, while
    // intentional acts (stance changes, equip/unequip) converge immediately
    // themselves. Players carry this; NPCs use the lighter EquipmentBlobbed.
    #[component(equipment in equipment_components, dirties(equipment_dirty_flag))]
    struct EquipmentComponent {
        pub equipped_entity_ids: Vec<EntityId>,
    }

    // The AUTHORED starting gear (gear-BLOB ids) an entity is born with —
    // a provisioning MANIFEST, never the runtime reality. Player provisioning
    // (new_player) instantiates one owned item entity per listed gear blob,
    // records their entity ids on EquipmentComponent, then deletes this. Stats
    // never read it. Present but inert on authored NPCs, whose stats come from
    // the summed EquipmentBlobbed instead — they never provision.
    #[component(starting_gear in starting_gear_components)]
    struct StartingGearComponent {
        pub armament_ids: Vec<u32>,
        pub worn_armor_id: Option<u32>,
        pub worn_relic_ids: Vec<u32>,
    }

    // NPC equipment kept LIGHT: the summed stat block of an entity's
    // authored gear (armaments + armor + relics), precomputed at push. No
    // item entities, no configuration, no reconciliation — it just feeds the
    // equipment cache the same total the per-item sum feeds for players. An
    // entity uses this OR a real EquipmentComponent, never both: the conflict
    // invariant strips this when a real EquipmentComponent appears (real gear
    // wins), so an NPC can opt into item entities by gaining one.
    #[component(equipment_blobbed in equipment_blobbed_components, dirties(equipment_dirty_flag))]
    struct EquipmentBlobbedComponent {
        pub stats: StatsBlock,
        pub appearance: AppearanceBlock,
        pub body_capacity: BodyCapacityBlock,
        pub readiness: ReadinessBlock,
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

    // The DEFAULT wielded set: the owned item ENTITIES the hands hold
    // whenever the active stance's customization assigns NO armaments — a
    // stance assignment is an OVERRIDE of this default, never a requirement.
    // Edited by the equip/unequip item actions and take's auto-wield ("the
    // item goes to the default slot"); resolution into actual hands lives in
    // resolved_armament_entity_ids.
    #[component(default_armaments in default_armaments_components)]
    struct DefaultArmamentsComponent {
        pub armament_entity_ids: Vec<EntityId>,
    }

    // CONFIGURATION: the chosen clothing/armor ITEM entity, applied across
    // every stance. Stats never read this — the worn reality lives on
    // EquipmentComponent, converged by the reconciliation system.
    #[component(armor in armor_components)]
    struct ArmorComponent {
        pub armor_entity_id: EntityId,
    }

    // CONFIGURATION: up to four chosen relic ITEM entities (enforced at the
    // reducer), applied across every stance. Same convergence as armor.
    #[component(relics in relics_components)]
    struct RelicsComponent {
        pub relic_entity_ids: Vec<EntityId>,
    }

    // The player's per-stance armament assignments (item ENTITY ids). Never
    // authored by blobs; no dirty flag because assignments only take effect
    // when a reducer rewrites EquipmentComponent (on assignment or stance swap).
    #[component(stance_customizations in stance_customizations_components)]
    struct StanceCustomizationsComponent {
        pub assignments: Vec<StanceCustomization>,
    }

    // An entity that IS an item: takeable, droppable, and shown in the
    // customization menu. Its stats live on its own Equippable, its look on its
    // own appearance features — it declares only its equip-slot kind here.
    #[component(item in item_components)]
    struct ItemComponent {
        pub item_ref: ItemRef,
    }

    // What one item entity contributes WHEN EQUIPPED: its per-group blocks
    // (stats, appearance, the hand/body/relic cost in body_capacity, and the
    // readiness tags it grants), stamped from the item's OWN authored blob at
    // instantiation (there is no gear asset table). The equipment computation
    // of whoever wields it sums the Equippable of every equipped item — the
    // single rule that replaces per-asset stat lookups — gating each item on
    // its body_capacity.
    #[component(equippable in equippable_components)]
    struct EquippableComponent {
        pub stats: StatsBlock,
        pub appearance: AppearanceBlock,
        pub body_capacity: BodyCapacityBlock,
        pub readiness: ReadinessBlock,
    }

    // Derived by the equipment stat computation: the equipped item ENTITIES
    // whose stats are NOT currently applied because applying them would drive
    // a capacity requirement (hand/body/relic) negative against the running
    // total of every other stat source — including transient status and the
    // active stance. The item stays equipped; it just contributes nothing
    // until capacity frees up. Present only while something is unapplied
    // (deleted when everything fits), so the client marks exactly these as
    // TEMPORARILY disabled.
    #[component(equipment_disabled in equipment_disabled_components)]
    struct EquipmentDisabledComponent {
        pub disabled_entity_ids: Vec<EntityId>,
    }

    // Per-group SOURCE CACHES: each source's contribution to a group, folded
    // once and memoized. Caches are grouped by BLOCK TYPE (not by source) so
    // every cache of a group dirties the same single group total flag. A fold
    // system upserts only the group caches whose value actually CHANGED, so a
    // source touching one group never recomputes the others.
    #[component(
      traits_stats_cache in traits_stats_cache_components,
      status_stats_cache in status_stats_cache_components,
      quest_stats_cache in quest_stats_cache_components,
      equipment_stats_cache in equipment_stats_cache_components,
      dirties(stats_dirty_flag),
    )]
    struct StatsCacheComponent {
        pub stats: StatsBlock,
    }

    #[component(
      traits_appearance_cache in traits_appearance_cache_components,
      quest_appearance_cache in quest_appearance_cache_components,
      equipment_appearance_cache in equipment_appearance_cache_components,
      dirties(appearance_dirty_flag),
    )]
    struct AppearanceCacheComponent {
        pub appearance: AppearanceBlock,
    }

    #[component(
      traits_readiness_cache in traits_readiness_cache_components,
      status_readiness_cache in status_readiness_cache_components,
      quest_readiness_cache in quest_readiness_cache_components,
      equipment_readiness_cache in equipment_readiness_cache_components,
      dirties(readiness_dirty_flag),
    )]
    struct ReadinessCacheComponent {
        pub readiness: ReadinessBlock,
    }

    // The STEADY sources' body-capacity caches (traits, quest): a change here
    // shifts the floor the equip gate stands on, so it dirties equipment too.
    // Equipment's OWN body-capacity contribution is a SEPARATE component
    // (equipment_body_capacity_cache below) that must NOT dirty equipment, or
    // the equipment computation would re-trigger itself forever.
    #[component(
      traits_body_capacity_cache in traits_body_capacity_cache_components,
      quest_body_capacity_cache in quest_body_capacity_cache_components,
      dirties(body_capacity_dirty_flag, equipment_dirty_flag),
    )]
    struct BodyCapacityCacheComponent {
        pub body_capacity: BodyCapacityBlock,
    }

    // Equipment's own contribution to the body-capacity total: dirties ONLY the
    // body-capacity total, never the equipment flag (see above).
    #[component(equipment_body_capacity_cache in equipment_body_capacity_cache_components, dirties(body_capacity_dirty_flag))]
    struct EquipmentBodyCapacityCacheComponent {
        pub body_capacity: BodyCapacityBlock,
    }

    #[component(
      // REFOLD flags: a source input changed, so its per-group caches must be
      // re-derived (the fold system then dirties only the group totals whose
      // value moved).
      traits_dirty_flag in traits_dirty_flag_components,
      status_dirty_flag in status_dirty_flag_components,
      quest_dirty_flag in quest_dirty_flag_components,
      equipment_dirty_flag in equipment_dirty_flag_components,
      // GROUP TOTAL flags: a group's total must be recomputed and re-applied.
      stats_dirty_flag in stats_dirty_flag_components,
      appearance_dirty_flag in appearance_dirty_flag_components,
      body_capacity_dirty_flag in body_capacity_dirty_flag_components,
      readiness_dirty_flag in readiness_dirty_flag_components,
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
      // DESTRUCTION requested: destruction_system spills this entity's
      // contents, spawns its debris, and deletes it. Death sets it on a
      // controllerless object (players respawn, NPCs corpse), but ANYTHING
      // can set it — a future "smash the wall" attack destroys directly,
      // no death required. The tier below cleanup, above nothing.
      destroyed in destroyed_components,
      // ABSOLUTE immobility: while present, every movement effect on this
      // entity is cancelled outright, whatever its gait — a rooted turret,
      // a training dummy, a plant. Authored (immobile: {}), never derived.
      // The enemy AI also refuses to queue a move while it stands, so a
      // flagged NPC never wastes a turn on a doomed step.
      immobile in immobile_components,
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

    // A generated map instance's identity: which map ASSET it realizes, and
    // WHOSE it is. Instances are keyed by (location_map_id, party_leader) — one
    // instance per party, so two parties exploring the same map never collide
    // and each keeps its own generated layout. party_leader is an entity id
    // (0 = the sanctioned null pointer, never a live entity).
    #[component(map_instance in map_instance_components)]
    struct MapInstanceComponent {
        pub location_map_id: u32,
        #[index(btree)]
        pub party_leader: EntityId,
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

    // TRANSIENT (per-tick): the hp/ep MAXIMA a recomputed StatsTotal wants this
    // entity to have. The stats-total system emits it instead of touching hp/ep
    // directly; the maxima_ratchet_system consumes it and RAISES the ceilings
    // (never lowers), carrying the current value up with each raise. Event-
    // backed, so it clears itself every transaction — a dirty flag that carries
    // its payload (the target maxima) rather than a bare marker.
    #[component(maxima_raise in maxima_raise_components, transient)]
    struct MaximaRaiseComponent {
        pub mhp: i16,
        pub mep: i16,
    }

    // The APPLIED per-group totals, each stored whole: these ARE the read
    // state (there is no aggregate). Rigid stats (attack, defense, size, the
    // hp/ep ceilings) read from StatsTotal; morale and the readiness tags read
    // from ReadinessTotal; the equip gate reads BodyCapacityTotal. Fluid values
    // (hp, ep) still live in their own components; StatsTotal only moves their
    // ceilings. Appearance's applied total is AppearanceFeaturesComponent.
    #[component(stats_total in stats_total_components)]
    struct StatsTotalComponent {
        pub stats: StatsBlock,
    }

    #[component(readiness_total in readiness_total_components)]
    struct ReadinessTotalComponent {
        pub readiness: ReadinessBlock,
    }

    #[component(body_capacity_total in body_capacity_total_components)]
    struct BodyCapacityTotalComponent {
        pub body_capacity: BodyCapacityBlock,
    }

    // FEAR: a timed morale debuff. `intimidation` is the intensity (folded
    // into the total as -morale through the status cache, exactly as courage
    // folds +morale); `duration` counts down each turn and the status is
    // removed at zero. Fear keeps the MAXIMUM intensity: a weaker fear
    // arriving over a stronger one is ignored and does not even refresh the
    // duration. Not cured by rally — you outlast it, or out-courage it.
    #[component(fear_status in fear_status_components, dirties(status_dirty_flag))]
    struct FearStatusComponent {
        pub intimidation: i16,
        pub duration: i16,
    }

    // COURAGE: rally's status effect. Its single value is BOTH the remaining
    // duration AND the +morale bonus: it decays by 1 each turn (bonus
    // shrinking with it) and is removed at zero. Rally STACKS it additively.
    // Folds into the total through the status cache so rigid morale absorbs
    // it, lifting effective morale back over the action thresholds a fear
    // pushed it under.
    #[component(courage_status in courage_status_components, dirties(status_dirty_flag))]
    struct CourageStatusComponent {
        pub morale: i16,
    }

    // BRACED: dive's status effect — bonus defense, folded through the
    // status cache exactly like courage. Cleared on the next stance change.
    #[component(braced_status in braced_status_components, dirties(status_dirty_flag))]
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

    // On an ENEMY: the last action its AI committed to, so enemy_control_system
    // rotates to the NEXT action in its list each turn (skipping any with no
    // valid target) instead of spamming the first — basic variety in a fight.
    #[component(action_cursor in action_cursor_components)]
    struct ActionCursorComponent {
        pub last_action_id: ActionId,
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
