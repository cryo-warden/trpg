use spacetimedb::{table, ReducerContext, SpacetimeType, Table};

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
    #[auto_inc]
    pub id: u64,
    #[unique]
    pub text: String,
    pub appearance_feature_type: AppearanceFeatureType,
    pub priority: i32,
}

pub struct AppearanceFeatureContext<'a> {
    pub ctx: &'a ReducerContext,
}

#[allow(dead_code)]
impl<'a> AppearanceFeatureContext<'a> {
    pub fn new(ctx: &'a ReducerContext) -> Self {
        Self { ctx }
    }

    pub fn insert_appearance_feature(
        self,
        text: &str,
        appearance_feature_type: AppearanceFeatureType,
        priority: i32,
    ) -> Self {
        self.ctx.db.appearance_features().insert(AppearanceFeature {
            id: 0,
            text: text.to_string(),
            appearance_feature_type,
            priority,
        });
        self
    }

    pub fn insert_noun(self, text: &str, priority: i32) -> Self {
        self.insert_appearance_feature(text, AppearanceFeatureType::Noun, priority)
    }

    pub fn insert_adjective(self, text: &str, priority: i32) -> Self {
        self.insert_appearance_feature(text, AppearanceFeatureType::Adjective, priority)
    }

    pub fn by_texts(&self, texts: &[&str]) -> Vec<u64> {
        texts
            .iter()
            .filter_map(|t| {
                self.ctx
                    .db
                    .appearance_features()
                    .text()
                    .find(t.to_string())
                    .map(|a| a.id)
            })
            .collect()
    }
}
