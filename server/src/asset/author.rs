//! Author-form asset types: the shapes the client pushes. Cross-references
//! BETWEEN top-level assets are by canonical NAME here, never by id.
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
    asset::location_map_theme::EntityBlobsSampler,
    entity::EntityBlob,
};

#[derive(Debug, Clone, SpacetimeType)]
pub struct ActionAuthor {
    pub name: String,
    pub action_type: ActionType,
    /// Ordered effects; push_assets derives the ActionStep rows (and their
    /// ids) from this sequence.
    pub steps: Vec<ActionEffect>,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct AppearanceFeatureAuthor {
    pub name: String,
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

/// A named stat-block owner: the shared author form of baselines and traits.
#[derive(Debug, Clone, SpacetimeType)]
pub struct StatBlockOwnerAuthor {
    pub name: String,
    pub stat_block: StatBlockAuthor,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EncounterBlobAuthor {
    pub name: String,
    pub blob: EntityBlob,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EncounterAuthor {
    pub name: String,
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
    pub name: String,
    pub decorations_selector: EntityBlobsSampler,
    pub min_decoration_count: u8,
    pub max_decoration_count: u8,
    pub paths_selector: EntityBlobsSampler,
    pub rooms_selector: EntityBlobsSampler,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct LocationMapAuthor {
    pub name: String,
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
