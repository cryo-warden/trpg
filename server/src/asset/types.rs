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
    entity::{
        AllegianceComponentBlob, AttackComponentBlob, EnemyControllerComponentBlob,
        EpComponentBlob, FlagComponentBlob, HpComponentBlob, LocationComponentBlob,
        NameComponentBlob, PathComponentBlob, PlayerControllerComponentBlob,
    },
    stat_group::{BodyCapacityBlock, ReadinessRequirements, StatsBlock},
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
    Rearm,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionAsset {
    pub action_type: ActionType,
    /// Thresholds the entity's READINESS total must meet for this action to
    /// appear in its derived available actions — the action set is the filter
    /// of every action whose requirements the readiness clears. (Readiness tags
    /// are how a source "grants" an action now: a blade grants `bladed`, and a
    /// slash requires it.) ReadinessRequirements carries no asset-name
    /// references, so the wire type is the stored type.
    pub requirements: ReadinessRequirements,
    /// Ordered rounds; push_assets derives the ActionRound rows (and their
    /// ids) from this. An action lives exactly as many ticks as it has
    /// rounds.
    pub rounds: Vec<ActionRoundAsset>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct AppearanceFeatureAsset {
    pub appearance_feature_type: AppearanceFeatureType,
    pub priority: i32,
    /// Mutual-exclusion group (see AppearanceFeature): features sharing a
    /// non-empty group render at most one at a time.
    pub exclusion_group: Option<String>,
}

/// A stat SOURCE as authored, grouped per stat group (deliberately NOT flat):
/// a source contributes to each group independently, and this authored shape
/// mirrors that split. Every group defaults, so an author names only the
/// groups a source actually touches (a plain trait sets `stats`; a blade sets
/// `stats` + `readiness` + the hand cost in `body_capacity`). There is NO
/// aggregate stored on the runtime side — resolution fans this out into the
/// four independent group values (see resolve_grouped_block).
///
/// Actions are NOT authored here: an action is available wherever its
/// requirements clear the readiness total, so a source grants an action by
/// providing the readiness tags that action requires — never by naming it.
#[derive(Debug, Clone, SpacetimeType, Default)]
pub struct GroupedBlockAsset {
    pub stats: StatsBlock,
    pub appearance: AppearanceBlockAsset,
    pub body_capacity: BodyCapacityBlock,
    pub readiness: crate::stat_group::ReadinessBlock,
}

/// The APPEARANCE group as authored. Appearance is the only group that resolves
/// names, so it is the only one needing a distinct asset type — the numeric
/// group blocks (StatsBlock / BodyCapacityBlock / ReadinessBlock) carry no name
/// references and so double as their own asset type, exactly as
/// ReadinessRequirements already does. push_assets resolves these names to the
/// stored feature ids (see AppearanceBlock).
#[derive(Debug, Clone, SpacetimeType, Default)]
pub struct AppearanceBlockAsset {
    pub feature_names: Vec<String>,
}

/// A stance as authored. Its block contributes to the entity's totals like a
/// baseline or trait — the readiness tags it provides make its techniques
/// available through the ordinary requirements filter. Its requirements gate
/// adopting the stance and are checked WITHOUT the stance's own contributions.
#[derive(Debug, Clone, SpacetimeType)]
pub struct StanceAsset {
    pub requirements: ReadinessRequirements,
    pub block: GroupedBlockAsset,
}

/// A quest as authored: the stat contribution EACH progress bit grants
/// (the computed total scales with the holder's popcount) and the quest's
/// total bit supply across the whole world — one quest may span many maps.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestAsset {
    pub per_bit_block: GroupedBlockAsset,
    pub bit_count: u32,
}

/// What KIND of item an authored entity IS. Gear is authored as an ordinary
/// entity blob carrying its own Equippable grant and appearance, so the gear
/// kinds reference nothing; only QuestItem names a quest bit to resolve.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ItemRefAsset {
    Armament,
    Armor,
    Relic,
    QuestItem(QuestItemRefAsset),
}

/// A quest item authored by quest NAME plus bit index; push_assets
/// resolves the name and validates the index against the quest's bitCount.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestItemRefAsset {
    pub quest_name: String,
    pub index: u32,
}

/// A reusable set of eligible traits (by NAME) and how many to draw, resolved
/// to a TraitPalette at push. A palette to draw from.
#[derive(Debug, Clone, SpacetimeType)]
pub struct TraitPaletteAsset {
    pub trait_names: Vec<String>,
    pub count_weights: Vec<u8>,
}

/// The authored form of the differentiable opt-in: the trait palette by NAME.
#[derive(Debug, Clone, SpacetimeType)]
pub struct DifferentiableAsset {
    pub trait_palette_name: String,
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
    /// The GRANT this item confers when equipped: its per-group Equippable
    /// contributions (the hand/body/relic cost and the readiness tags that make
    /// actions available). Authored directly, like any component — gear is an
    /// entity, not a table row.
    pub equippable: Option<GroupedBlockAsset>,
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
    /// Opt-in to variety/differentiation: the trait palette to draw from.
    pub differentiable: Option<DifferentiableAsset>,
    /// Marks the entity as attunable fortune-telling scenery.
    pub checkpoint_object: Option<FlagComponentBlob>,
    /// Marks the entity as ABSOLUTELY immobile: every movement effect on it
    /// is cancelled while this stands, whatever its gait (see ImmobileComponent).
    pub immobile: Option<FlagComponentBlob>,
    /// The abstract destination attuning to this object binds: a map by
    /// NAME plus which of its generated checkpoints. Never a room entity —
    /// the room may not exist until the binding is cashed in.
    pub checkpoint_binding: Option<CheckpointBindingAsset>,
    /// Where this entity wakes/spawns: a map by NAME plus checkpoint index.
    /// The new-player blob carries one (starting map, index 0) so the
    /// player-location invariant can seat a fresh player without any hardcoded
    /// "first map" rule.
    pub checkpoint: Option<CheckpointAsset>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct CheckpointBindingAsset {
    pub location_map_name: String,
    pub checkpoint_index: u32,
}

/// The authored form of a CheckpointComponent: a map by NAME plus which of its
/// generated checkpoints, resolved to ids at push.
#[derive(Debug, Clone, SpacetimeType)]
pub struct CheckpointAsset {
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

/// A matched pair of path presentations, authored: forward leads deeper,
/// backward faces home (opening pairs with opening; chasm with the rock
/// wall climbed back up).
#[derive(Debug, Clone, SpacetimeType)]
pub struct PathBlobPairAsset {
    pub forward: EntityBlobAsset,
    pub backward: EntityBlobAsset,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct PathBlobPairSampleAsset {
    pub weight: u8,
    pub pair: PathBlobPairAsset,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct PathBlobPairsSamplerAsset {
    pub selections: Vec<PathBlobPairSampleAsset>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapThemeAsset {
    pub decorations_selector: EntityBlobsSamplerAsset,
    pub min_decoration_count: u8,
    pub max_decoration_count: u8,
    pub paths_selector: PathBlobPairsSamplerAsset,
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
    /// Optional path-variation TRAITS, authored by name and resolved to ids
    /// at push: adjective-bearing traits rolled into paths at generation and
    /// routed through the ordinary trait pipeline (a path's baseline has max
    /// HP 0, so it stays bodiless).
    pub path_variation_trait_names: Vec<String>,
    /// Weighted count distribution for path variations (index = count).
    pub path_variation_count_weights: Vec<u8>,
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
    /// When set, felling the last of the claimed encounter's spawns
    /// drops these items — one per player present.
    pub defeat_drop: Option<QuestDefeatDropAsset>,
}

/// A boss claim's drop as authored: the reward quest by NAME — its OWN
/// reference, so one quest's monster may hold another quest's item — the
/// bit index (validated against that quest's bit count), and the item's
/// presentation blob inline, exactly like a spawn window's.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestDefeatDropAsset {
    pub quest_name: String,
    pub index: u32,
    pub item_blob: EntityBlobAsset,
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

/// Where a map's ROOMS live, and how: every generated room receives this
/// location pair — a NAMED world entity plus Exterior or Interior.
/// Exterior rooms see their outer location's entities (the sky),
/// recursively while edges stay exterior; Interior rooms cut the chain
/// while still nesting somewhere.
#[derive(Debug, Clone, SpacetimeType)]
pub struct RoomLocationAsset {
    pub location_name: String,
    pub kind: crate::entity::LocationKind,
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
    /// ALL of this map's rooms gain this location; None leaves rooms
    /// unnested (legacy/test worlds).
    pub room_location: Option<RoomLocationAsset>,
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
    /// CROSS-MAP paths are even more special: an authored pair themed by
    /// both endpoints ("dark cave mouth" going in, "bright cave mouth"
    /// coming out). forward rides the authored direction, backward the
    /// both_ways reverse; omitted, each side samples its exit theme.
    pub path_pair: Option<PathBlobPairAsset>,
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
        (GroupedBlockAsset, NamedGroupedBlockAsset),
        (StanceAsset, NamedStanceAsset),
        (QuestAsset, NamedQuestAsset),
        (EntityBlobAsset, NamedEntityBlobAsset),
        (EncounterAsset, NamedEncounterAsset),
        (LocationMapThemeAsset, NamedLocationMapThemeAsset),
        (LocationMapAsset, NamedLocationMapAsset),
        (TraitPaletteAsset, NamedTraitPaletteAsset),
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
