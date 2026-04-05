use spacetimedb::table;

use crate::asset::stat_block::StatBlock;

#[table(accessor = traits)]
#[derive(Debug, Clone)]
pub struct Trait {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub stat_block: StatBlock,
}
