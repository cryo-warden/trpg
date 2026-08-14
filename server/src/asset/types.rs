//! The asset types as authored: the shapes the client pushes. Assets are
//! authored client-side as Records keyed by canonical name; SATS has no map
//! type, so a Record<name, body> crosses the wire as Vec<Named<Body>> — the
//! names come verbatim from the Record keys, and cross-references BETWEEN
//! assets are by name here, never by id.
//!
//! The forward (name -> id) conversion happens in push_assets on the server,
//! and only there: id assignment — and, later, migration of already-stored
//! rows when a re-push changes the asset set — must be authoritative over the
//! stored data, so only the server can do it reliably. The client goes the
//! other way only: it converts the ids it sees in component data back to
//! names via its subscription of the asset tables (id + name columns).

use spacetimedb::SpacetimeType;

use crate::{
    action::ActionType,
    appearance::AppearanceFeatureType,
    asset::location_map::{ConnectionAnchor, Layout, ZoneKind},
    asset::stat_block::StatRequirements,
    entity::{
        AllegianceComponentBlob, AttackComponentBlob, EnemyControllerComponentBlob,
        EpComponentBlob, FlagComponentBlob, HpComponentBlob, LocationComponentBlob,
        NameComponentBlob, PathComponentBlob, PlayerControllerComponentBlob,
    },
};

/// One round of an action: every effect here resolves in the same system
/// tick, and an empty list is a wait round. (A named struct rather than a
/// bare Vec<Vec<..>> because the TS codegen cannot lazily reference an enum
/// inside a nested array.)
#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionRoundAsset {
    pub effects: Vec<ActionEffectAsset>,
    /// While this round is the active one, queuing a new action cancels the
    /// action immediately instead of waiting it out.
    pub interruptible: bool,
}

/// The AUTHORED form of an action effect: effects that reference other
/// assets do so by NAME, and push_assets resolves them to the stored
/// ActionEffect's integer ids — the same forward-only conversion as every
/// other asset reference.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ActionEffectAsset {
    Buff(crate::action::Buff),
    Attack(i16),
    Heal(i16),
    Move,
    Take,
    Drop,
    Equip,
    Unequip,
    Eat,
    Intimidate(i16),
    Rally,
    Dive(i16),
    Attune,
    /// The stance to change into, by name.
    SetStance(String),
    Open,
    Dump,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionAsset {
    pub action_type: ActionType,
    /// Thresholds the entity's TOTAL stat block must meet for this action to
    /// appear in its derived available actions. (StatRequirements carries no
    /// asset-name references, so the wire type is the stored type.)
    pub requirements: StatRequirements,
    /// Ordered rounds; push_assets derives the ActionRound rows (and their
    /// ids) from this. An action lives exactly as many ticks as it has
    /// rounds.
    pub rounds: Vec<ActionRoundAsset>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct AppearanceFeatureAsset {
    pub text: String,
    pub appearance_feature_type: AppearanceFeatureType,
    pub priority: i32,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct StatBlockAsset {
    pub attack: i8,
    pub mhp: i16,
    pub defense: i8,
    pub mep: i16,
    pub hand: i8,
    pub gait: i8,
    pub reach: i8,
    pub blunt: i8,
    pub bladed: i8,
    pub pole: i8,
    pub ward: i8,
    pub focus: i8,
    pub wing: i8,
    /// How upright the posture leaves the body: stances provide it, and
    /// actions that need footing (dive, lying down) require it.
    pub upright: i8,
    /// Granular size: contests, intimidation, and (later) pickup and gear
    /// gating all compare DELTAS, so nothing is inherently gargantuan — a
    /// kaiju battle and a fairy battle are the same mechanics.
    pub size: i8,
    /// Morale is RIGID: it lives on the stat block like attack, never in a
    /// fluid component. Fear/courage statuses contribute through the
    /// status stat-block cache.
    pub morale: i8,
    pub action_names: Vec<String>,
    pub appearance_feature_names: Vec<String>,
}

/// A stance as authored. Its stat block contributes to the entity's total
/// like a baseline or trait — including granted action_ids, the stance's
/// techniques (at most 6; enforced at push). Its requirements gate adopting
/// the stance and are checked WITHOUT the stance's own contributions.
#[derive(Debug, Clone, SpacetimeType)]
pub struct StanceAsset {
    pub requirements: StatRequirements,
    pub stat_block: StatBlockAsset,
}

/// A quest as authored: the stat contribution EACH progress bit grants
/// (the computed total scales with the holder's popcount) and the quest's
/// total bit supply across the whole world — one quest may span many maps.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestAsset {
    pub per_bit_stat_block: StatBlockAsset,
    pub bit_count: u32,
}

/// What an authored item entity IS, referencing its gear asset by NAME;
/// push_assets resolves it to the stored ItemRef's integer id.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ItemRefAsset {
    Armament(String),
    Armor(String),
    Relic(String),
    QuestItem(QuestItemRefAsset),
}

/// A quest item authored by quest NAME plus bit index; push_assets
/// resolves the name and validates the index against the quest's bitCount.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestItemRefAsset {
    pub quest_name: String,
    pub index: u32,
}

/// The authored form of an entity blob: components whose fields reference
/// other assets are authored by NAME, and only push_assets resolves them to
/// the integer ids stored in the real EntityBlob. Runtime-state components
/// (stat caches, dirty flags, action state, timers, location_map) are
/// deliberately absent — a prefab never authors those.
#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobAsset {
    pub name: Option<NameComponentBlob>,
    pub location: Option<LocationComponentBlob>,
    pub path: Option<PathComponentBlob>,
    pub allegiance: Option<AllegianceComponentBlob>,
    pub baseline_name: Option<String>,
    pub stance_name: Option<String>,
    pub trait_names: Option<Vec<String>>,
    pub armament_names: Option<Vec<String>>,
    pub armor_name: Option<String>,
    pub relic_names: Option<Vec<String>>,
    pub item: Option<ItemRefAsset>,
    pub action_names: Option<Vec<String>>,
    /// Actions this OBJECT offers to anyone standing beside it (open,
    /// dump; later doors and levers) — explicit per entity, never
    /// inferred from what it looks like.
    pub offered_action_names: Option<Vec<String>>,
    pub pinned_action_names: Option<Vec<String>>,
    pub appearance_feature_names: Option<Vec<String>>,
    /// What breaking this entity leaves behind (rubble, ceramic shards…):
    /// presence marks the entity as a BREAKABLE that spills and becomes
    /// decoration when its hp runs out.
    pub remains_appearance_feature_names: Option<Vec<String>>,
    pub hp: Option<HpComponentBlob>,
    pub ep: Option<EpComponentBlob>,
    pub attack: Option<AttackComponentBlob>,
    pub player_controller: Option<PlayerControllerComponentBlob>,
    pub enemy_controller: Option<EnemyControllerComponentBlob>,
    /// Marks the entity as attunable fortune-telling scenery.
    pub checkpoint_object: Option<FlagComponentBlob>,
    /// The abstract destination attuning to this object binds: a map by
    /// NAME plus which of its generated checkpoints. Never a room entity —
    /// the room may not exist until the binding is cashed in.
    pub checkpoint_binding: Option<CheckpointBindingAsset>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct CheckpointBindingAsset {
    pub location_map_name: String,
    pub checkpoint_index: u32,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobSampleAsset {
    pub weight: u8,
    pub blob: EntityBlobAsset,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobsSamplerAsset {
    pub selections: Vec<EntityBlobSampleAsset>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EncounterAsset {
    pub categoric_blob_name: String,
    pub blob_names: Vec<String>,
}

/// A weighted reference to another asset by name, resolved at push time.
#[derive(Debug, Clone, SpacetimeType)]
pub struct WeightedNameAsset {
    pub weight: u8,
    pub name: String,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapThemeAsset {
    pub decorations_selector: EntityBlobsSamplerAsset,
    pub min_decoration_count: u8,
    pub max_decoration_count: u8,
    pub paths_selector: EntityBlobsSamplerAsset,
    pub rooms_selector: EntityBlobsSamplerAsset,
    /// The themed fortune-telling scenery placed in each map's guaranteed
    /// checkpoint room (the entrance).
    pub checkpoints_selector: EntityBlobsSamplerAsset,
    /// Themed breakable containers scattered through side branches and the
    /// far end; the quest layer may hide loot inside. Count range is
    /// half-open like the other count ranges.
    pub containers_selector: EntityBlobsSamplerAsset,
    pub min_container_count: u8,
    pub max_container_count: u8,
    /// Themed breakable walls blocking hidden paths and shortcuts until
    /// smashed; authored with hp and remains like any breakable.
    pub blockers_selector: EntityBlobsSamplerAsset,
}

/// One quest's room claim in one map, as authored: quest and encounter by
/// NAME, resolved at push. Every instance of the map gives its Ending
/// room to the quest for this role, spawning the encounter there — and,
/// when spawn_checkpoint_before is set, a themed checkpoint object in the
/// room just before it.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestRoomClaimAsset {
    pub quest_name: String,
    pub role: crate::quest::QuestRoomRole,
    pub encounter_name: String,
    pub spawn_checkpoint_before: bool,
    /// When set (validated against the quest's bit count), felling the
    /// last of the claimed encounter's spawns grants this bit to every
    /// player present.
    pub defeat_bit_index: Option<u32>,
}

/// One quest's spawn window in one map, as authored: the quest by NAME
/// and the item's presentation blob inline (theme samplers author blobs
/// the same way). Push validates every index against the quest's
/// bit_count and refuses an index guaranteed by more than one map.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestSpawnAsset {
    pub quest_name: String,
    pub item_blob: EntityBlobAsset,
    pub guaranteed_indexes: Vec<u32>,
    pub eligible_indexes: Vec<u32>,
    /// Half-open count range for the eligible draw, like encounter counts.
    pub min_eligible_count: u8,
    pub max_eligible_count: u8,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapAsset {
    pub theme_name: String,
    pub layout: Layout,
    pub zone_kind: ZoneKind,
    pub rng_seed: Option<u64>,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
    pub encounter_names_sampler: Vec<WeightedNameAsset>,
    pub min_encounter_count: u8,
    pub max_encounter_count: u8,
    /// Half-open count range: side rooms hidden behind breakable walls
    /// (capped by generated extras). Backward paths have no separate
    /// count — loop_count IS the number of guarded backward paths.
    pub min_hidden_room_count: u8,
    pub max_hidden_room_count: u8,
    pub quest_spawns: Vec<QuestSpawnAsset>,
    pub quest_room_claims: Vec<QuestRoomClaimAsset>,
}

/// A cross-map connection as authored: a JOIN row between two maps by name,
/// with the anchor on each side and an optional both-ways expansion (push
/// derives one directed LocationMapConnection row per direction).
#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapConnectionAsset {
    pub exit_location_map_name: String,
    pub destination_location_map_name: String,
    pub exit_anchor: ConnectionAnchor,
    pub destination_anchor: ConnectionAnchor,
    pub both_ways: bool,
}

// One entry of an authored Record: `name` is the Record key, taken verbatim
// from the client's asset Record. SATS has no map type (and codegen cannot
// monomorphize a generic Named<T>), so a Record<name, body> crosses the wire
// as a Vec of these per-kind pairs.
secador::secador!(
    (Body, NamedBody),
    [
        (ActionAsset, NamedActionAsset),
        (AppearanceFeatureAsset, NamedAppearanceFeatureAsset),
        (StatBlockAsset, NamedStatBlockAsset),
        (StanceAsset, NamedStanceAsset),
        (QuestAsset, NamedQuestAsset),
        (EntityBlobAsset, NamedEntityBlobAsset),
        (EncounterAsset, NamedEncounterAsset),
        (LocationMapThemeAsset, NamedLocationMapThemeAsset),
        (LocationMapAsset, NamedLocationMapAsset),
    ],
    {
        seca!(1);
        #[derive(Debug, Clone, SpacetimeType)]
        pub struct __NamedBody {
            pub name: String,
            pub value: __Body,
        }
    }
);
