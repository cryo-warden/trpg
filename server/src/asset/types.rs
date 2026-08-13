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
    action::{ActionEffect, ActionType},
    appearance::AppearanceFeatureType,
    asset::location_map::Layout,
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
    pub effects: Vec<ActionEffect>,
    /// While this round is the active one, queuing a new action cancels the
    /// action immediately instead of waiting it out.
    pub interruptible: bool,
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
    /// Granular size: contests, intimidation, and (later) pickup and gear
    /// gating all compare DELTAS, so nothing is inherently gargantuan — a
    /// kaiju battle and a fairy battle are the same mechanics.
    pub size: i8,
    /// Base (maximum) morale; current morale lives in MoraleComponent.
    pub morale: i8,
    pub action_names: Vec<String>,
    pub appearance_feature_names: Vec<String>,
    /// Stances GRANTED by this block: bodies grant their postures, traits
    /// (and later quest rewards) grant more. An entity knows exactly the
    /// stances its total stat block grants.
    pub stance_names: Vec<String>,
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

/// What an authored item entity IS, referencing its gear asset by NAME;
/// push_assets resolves it to the stored ItemRef's integer id.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ItemRefAsset {
    Armament(String),
    Armor(String),
    Relic(String),
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
    pub pinned_action_names: Option<Vec<String>>,
    pub appearance_feature_names: Option<Vec<String>>,
    pub hp: Option<HpComponentBlob>,
    pub ep: Option<EpComponentBlob>,
    pub attack: Option<AttackComponentBlob>,
    pub player_controller: Option<PlayerControllerComponentBlob>,
    pub enemy_controller: Option<EnemyControllerComponentBlob>,
    /// Marks the entity as attunable fortune-telling scenery.
    pub checkpoint_object: Option<FlagComponentBlob>,
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
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapAsset {
    pub theme_name: String,
    pub layout: Layout,
    pub rng_seed: Option<u64>,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
    pub encounter_names_sampler: Vec<WeightedNameAsset>,
    pub min_encounter_count: u8,
    pub max_encounter_count: u8,
    /// Names of destination maps; push_assets derives the
    /// LocationMapConnection rows from these.
    pub connection_names: Vec<String>,
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
