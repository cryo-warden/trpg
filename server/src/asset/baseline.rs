use spacetimedb::table;

use crate::asset::stat_block::StatBlock;

#[table(accessor = baselines, public)]
#[derive(Debug, Clone)]
pub struct Baseline {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub stat_block: StatBlock,
}
