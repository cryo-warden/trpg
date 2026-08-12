use spacetimedb::SpacetimeType;

/// What an item entity IS: one reference into exactly one gear asset kind.
/// An explicit sum type, never inferred from names or table probing.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ItemRef {
    Armament(u32),
    Armor(u32),
    Relic(u32),
}

/// One stance's assigned armaments inside a player's loadouts. Assignments
/// reference armament ASSET ids; ownership is validated by counting the
/// player's item entities at assignment time (two one-handed blades need two
/// owned blades — the counted-multiset rule).
#[derive(Debug, Clone, SpacetimeType)]
pub struct StanceArmaments {
    pub stance_id: u32,
    pub armament_ids: Vec<u32>,
}
