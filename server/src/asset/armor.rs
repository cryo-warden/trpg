use spacetimedb::table;

use crate::asset::stat_block::StatBlock;

/// Clothing/armor: a single global slot on the entity, applied across every
/// stance (unlike armaments, which are assigned per stance). Public so the
/// client can resolve armor ids back to names for the loadout menu.
#[table(accessor = armors, public)]
#[derive(Debug, Clone)]
pub struct Armor {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub stat_block: StatBlock,
}
