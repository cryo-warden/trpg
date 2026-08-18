use spacetimedb::table;

use crate::asset::stat_block::StatBlock;

/// A wieldable armament: an ordinary stat-block contribution merged through
/// the equipment cache. Armaments PROVIDE armament properties (bladed,
/// blunt, pole, ward, focus, ...), CONSUME grip (negative hand), and grant
/// their own basic attack actions — whose requirements then re-check the
/// merged total like any other action.
// Public so the client can resolve armament ids back to names for the
// customization menu.
#[table(accessor = armaments, public)]
#[derive(Debug, Clone)]
pub struct Armament {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub stat_block: StatBlock,
    /// The item ENTITY's own appearance features, stamped onto each spawned
    /// instance. Separate from `stat_block` (the Equippable grant): a wielder
    /// never takes on the look of the gear it holds.
    pub appearance_feature_ids: Vec<u32>,
}
