use spacetimedb::table;

use crate::stat_group::{AppearanceBlock, BodyCapacityBlock, ReadinessBlock, StatsBlock};

/// Quests: the per-bit stat contribution scales with the holder's progress
/// popcount (entities_quests_progress). Public so the client can render
/// quest state and item freshness.
#[table(accessor = quests, public)]
#[derive(Debug, Clone)]
pub struct Quest {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub per_bit_stats: StatsBlock,
    pub per_bit_appearance: AppearanceBlock,
    pub per_bit_body_capacity: BodyCapacityBlock,
    pub per_bit_readiness: ReadinessBlock,
    pub bit_count: u32,
}
