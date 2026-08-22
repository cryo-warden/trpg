use spacetimedb::table;

use crate::stat_group::{AppearanceBlock, BodyCapacityBlock, ReadinessBlock, StatsBlock};

/// A wieldable armament: its per-group blocks merge through the equipment
/// computation. Armaments PROVIDE armament readiness tags (bladed, blunt, pole,
/// ward, focus, ...) that make their techniques available through the ordinary
/// requirements filter, and CONSUME grip (negative hand in body_capacity).
// Public so the client can resolve armament ids back to names for the
// customization menu.
#[table(accessor = armaments, public)]
#[derive(Debug, Clone)]
pub struct Armament {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub stats: StatsBlock,
    /// The GRANT's appearance contribution (folded into the wielder), distinct
    /// from `appearance_feature_ids` below.
    pub appearance: AppearanceBlock,
    pub body_capacity: BodyCapacityBlock,
    pub readiness: ReadinessBlock,
    /// The item ENTITY's own appearance features, stamped onto each spawned
    /// instance. Separate from the grant: a wielder never takes on the look of
    /// the gear it holds.
    pub appearance_feature_ids: Vec<u32>,
}
