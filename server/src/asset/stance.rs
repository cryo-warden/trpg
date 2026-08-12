use spacetimedb::{table, SpacetimeType};

use crate::asset::stat_block::{StatBlock, StatRequirements};

/// Stances the SERVER itself must find (never by name-sniffing): the push
/// resolves the authored name and stores the id here, mirroring
/// SpecialEntityBlobKey.
#[derive(Debug, Clone, SpacetimeType, PartialEq, Eq, Hash)]
pub enum SpecialStanceKey {
    /// The stance intimidation forces entities into.
    Cowering,
}

#[table(accessor = special_stances)]
pub struct SpecialStance {
    #[primary_key]
    pub key: SpecialStanceKey,
    pub stance_id: u32,
}

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
