use spacetimedb::{table, SpacetimeType};

#[derive(Debug, Clone, SpacetimeType)]
pub enum AppearanceFeatureType {
    Noun,
    Adjective,
}

// appearance_features represents the canonical features used to assign IDs to StatBlocks.
#[table(name = appearance_features, public)]
#[table(name = en_appearance_features, public)]
#[derive(Debug, Clone)]
pub struct AppearanceFeature {
    #[primary_key]
    pub index: u32,
    pub text: String,
    pub appearance_feature_type: AppearanceFeatureType,
    pub priority: i32,
}
