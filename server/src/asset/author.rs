//! Author-form asset types: the shapes the client pushes. Assets are authored
//! client-side as Records keyed by canonical name; SATS has no map type, so a
//! Record<name, body> crosses the wire as Vec<Named<Body>> — the names come
//! verbatim from the Record keys, and cross-references BETWEEN assets are by
//! name here, never by id.
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
    entity::{
        AllegianceComponentBlob, AttackComponentBlob, EnemyControllerComponentBlob,
        EpComponentBlob, HpComponentBlob, LocationComponentBlob, NameComponentBlob,
        PathComponentBlob, PlayerControllerComponentBlob,
    },
};

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionAuthor {
    pub action_type: ActionType,
    /// Ordered effects; push_assets derives the ActionStep rows (and their
    /// ids) from this sequence.
    pub steps: Vec<ActionEffect>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct AppearanceFeatureAuthor {
    pub text: String,
    pub appearance_feature_type: AppearanceFeatureType,
    pub priority: i32,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct StatBlockAuthor {
    pub attack: i32,
    pub mhp: i32,
    pub defense: i32,
    pub mep: i32,
    pub action_names: Vec<String>,
    pub appearance_feature_names: Vec<String>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionHotkeyAuthor {
    pub action_name: String,
    pub character_code: u32,
}

/// The author form of an entity blob: components whose fields reference other
/// assets are authored by NAME, and only push_assets resolves them to the
/// integer ids stored in the real EntityBlob. Runtime-state components (stat
/// caches, dirty flags, action state, timers, location_map) are deliberately
/// absent — a prefab never authors those.
#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobAuthor {
    pub name: Option<NameComponentBlob>,
    pub location: Option<LocationComponentBlob>,
    pub path: Option<PathComponentBlob>,
    pub allegiance: Option<AllegianceComponentBlob>,
    pub baseline_name: Option<String>,
    pub trait_names: Option<Vec<String>>,
    pub action_names: Option<Vec<String>>,
    pub action_hotkeys: Option<Vec<ActionHotkeyAuthor>>,
    pub appearance_feature_names: Option<Vec<String>>,
    pub hp: Option<HpComponentBlob>,
    pub ep: Option<EpComponentBlob>,
    pub attack: Option<AttackComponentBlob>,
    pub player_controller: Option<PlayerControllerComponentBlob>,
    pub enemy_controller: Option<EnemyControllerComponentBlob>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobSampleAuthor {
    pub weight: u8,
    pub blob: EntityBlobAuthor,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EntityBlobsSamplerAuthor {
    pub selections: Vec<EntityBlobSampleAuthor>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EncounterAuthor {
    pub categoric_blob_name: String,
    pub blob_names: Vec<String>,
}

/// A weighted reference to another asset by name, resolved at push time.
#[derive(Debug, Clone, SpacetimeType)]
pub struct WeightedNameAuthor {
    pub weight: u8,
    pub name: String,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapThemeAuthor {
    pub decorations_selector: EntityBlobsSamplerAuthor,
    pub min_decoration_count: u8,
    pub max_decoration_count: u8,
    pub paths_selector: EntityBlobsSamplerAuthor,
    pub rooms_selector: EntityBlobsSamplerAuthor,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapAuthor {
    pub theme_name: String,
    pub layout: Layout,
    pub rng_seed: Option<u64>,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
    pub encounter_names_sampler: Vec<WeightedNameAuthor>,
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
        (ActionAuthor, NamedActionAuthor),
        (AppearanceFeatureAuthor, NamedAppearanceFeatureAuthor),
        (StatBlockAuthor, NamedStatBlockAuthor),
        (EntityBlobAuthor, NamedEntityBlobAuthor),
        (EncounterAuthor, NamedEncounterAuthor),
        (LocationMapThemeAuthor, NamedLocationMapThemeAuthor),
        (LocationMapAuthor, NamedLocationMapAuthor),
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
