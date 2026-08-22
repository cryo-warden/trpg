// The stat model, decomposed into four INDEPENDENT group blocks. Each block
// carries only its own fields and its own operations; there is deliberately no
// parent/aggregate type binding them together (StatBlock, being retired, was
// exactly that aggregate). Groups that happen to add/negate the same way still
// spell that logic out separately — the repetition is incidental, not a shared
// abstraction to factor out, because the groups are only alike by coincidence.
//
// GROUPS:
//   StatsBlock        — mhp/mep/attack/defense/size; every physical object has
//                       these.
//   AppearanceBlock   — the appearance feature id set; every physical object
//                       has these.
//   BodyCapacityBlock — hand/body/relic; the ONLY group that gates equipment
//                       (admits_equipment_item), so the ONLY group whose change
//                       need dirty equipment computation.
//   ReadinessBlock    — morale plus the action-suggesting tags (bladed, wing,
//                       fang, ...); only meaningful on entities that can act, so
//                       it owns the action-gating requirements check.
//
mod appearance_block;
mod body_capacity_block;
mod readiness_block;
mod stats_block;

pub use appearance_block::AppearanceBlock;
pub use body_capacity_block::BodyCapacityBlock;
pub use readiness_block::{ReadinessBlock, ReadinessRequirements};
pub use stats_block::StatsBlock;
