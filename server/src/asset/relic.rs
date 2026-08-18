use spacetimedb::table;

use crate::asset::stat_block::StatBlock;

/// Relics: up to four worn at once, applied across every stance (unlike
/// armaments, which are assigned per stance). Public so the client can
/// resolve relic ids back to names for the customization menu.
#[table(accessor = relics, public)]
#[derive(Debug, Clone)]
pub struct Relic {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub stat_block: StatBlock,
    /// The item ENTITY's own appearance features (see Armament).
    pub appearance_feature_ids: Vec<u32>,
}
