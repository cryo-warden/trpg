use spacetimedb::{table, SpacetimeType};

#[derive(Debug, Clone, SpacetimeType)]
pub enum AppearanceFeatureType {
    Noun,
    Adjective,
}

// appearance_features represents the canonical features used to assign IDs to StatBlocks.
#[table(accessor = appearance_features)]
#[table(accessor = en_appearance_features)]
#[derive(Debug, Clone)]
pub struct AppearanceFeature {
    #[primary_key]
    pub index: u32,
    pub text: String,
    pub appearance_feature_type: AppearanceFeatureType,
    pub priority: i32,
}
