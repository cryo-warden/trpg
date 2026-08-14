use spacetimedb::SpacetimeType;

/// What an item entity IS: one reference into exactly one gear asset kind.
/// An explicit sum type, never inferred from names or table probing.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ItemRef {
    Armament(u32),
    Armor(u32),
    Relic(u32),
}

/// One stance's loadout inside a player's assignments: the armaments it
/// wields and the ACTIONS it pins to the bar (in bar order — position is
/// the hotkey). Armaments reference armament ASSET ids; ownership is
/// validated by counting the player's item entities at assignment time
/// (two one-handed blades need two owned blades — the counted-multiset
/// rule). Actions are validated against the stance's candidate pool. An
/// empty action list means "leave the bar alone" on adoption.
#[derive(Debug, Clone, SpacetimeType)]
pub struct StanceLoadout {
    pub stance_id: u32,
    pub armament_ids: Vec<u32>,
    pub action_ids: Vec<u32>,
}
