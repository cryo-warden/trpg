use spacetimedb::{table, SpacetimeType};

#[derive(Debug, Clone, SpacetimeType)]
pub enum AppearanceFeatureType {
    Noun,
    Adjective,
}

// appearance_features represents the canonical features used to assign IDs to StatBlocks.
// Public so the client can convert the feature indexes it sees in component
// data back to names (the backward direction of the name/id asymmetry).
#[table(accessor = appearance_features, public)]
#[table(accessor = en_appearance_features)]
#[derive(Debug, Clone)]
pub struct AppearanceFeature {
    #[primary_key]
    pub index: u32,
    #[unique]
    pub name: String,
    pub text: String,
    pub appearance_feature_type: AppearanceFeatureType,
    pub priority: i32,
}
