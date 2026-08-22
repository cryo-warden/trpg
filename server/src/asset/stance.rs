use spacetimedb::{table, SpacetimeType};

use crate::stat_group::{
    BodyCapacityBlock, ReadinessBlock, ReadinessRequirements, StatsBlock,
};

/// Stances the SERVER itself must find (never by name-sniffing): the push
/// resolves the authored name and stores the id here, mirroring
/// SpecialEntityBlobKey.
#[derive(Debug, Clone, SpacetimeType, PartialEq, Eq, Hash)]
pub enum SpecialStanceKey {
    /// The stance a dive lands in.
    Prone,
}

#[table(accessor = special_stances)]
pub struct SpecialStance {
    #[primary_key]
    pub key: SpecialStanceKey,
    pub stance_id: u32,
}

/// A stance: the exclusive posture an entity fights from. Its per-group blocks
/// contribute to the entity's stats/readiness/body-capacity totals (the
/// readiness tags it provides make its techniques available through the
/// requirements filter); a stance grants no appearance. Its requirements gate
/// ADOPTING it, checked against the entity's readiness WITHOUT any stance: a
/// stance never provides the properties needed to enter itself.
#[table(accessor = stances, public)]
#[derive(Debug, Clone)]
pub struct Stance {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub requirements: ReadinessRequirements,
    pub stats: StatsBlock,
    pub body_capacity: BodyCapacityBlock,
    pub readiness: ReadinessBlock,
}
