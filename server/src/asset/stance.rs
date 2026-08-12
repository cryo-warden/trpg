use spacetimedb::table;

use crate::asset::stat_block::{StatBlock, StatRequirements};

/// A stance: the exclusive posture an entity fights from. Its stat block is
/// an ordinary contribution to the entity's total (including granted
/// action_ids — the stance's techniques), and its requirements gate ADOPTING
/// it, checked against the entity's stat context WITHOUT any stance: a
/// stance never provides the properties needed to enter itself.
#[table(accessor = stances, public)]
#[derive(Debug, Clone)]
pub struct Stance {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub requirements: StatRequirements,
    pub stat_block: StatBlock,
}
