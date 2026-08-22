use spacetimedb::table;

use crate::stat_group::{AppearanceBlock, BodyCapacityBlock, ReadinessBlock, StatsBlock};

#[table(accessor = baselines)]
#[derive(Debug, Clone)]
pub struct Baseline {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub stats: StatsBlock,
    pub appearance: AppearanceBlock,
    pub body_capacity: BodyCapacityBlock,
    pub readiness: ReadinessBlock,
}
