use spacetimedb::SpacetimeType;

/// One specific bit of one specific quest, carried by a physical item:
/// eating the item sets the bit. Duplicates of an index may exist across
/// maps and instances — supply is limited by BITS, not physical items.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestItemRef {
    pub quest_id: u32,
    pub index: u32,
}

/// What an item entity IS: one reference into exactly one asset kind.
/// An explicit sum type, never inferred from names or table probing.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ItemRef {
    Armament(u32),
    Armor(u32),
    Relic(u32),
    QuestItem(QuestItemRef),
}

/// One stance's customization inside a player's assignments. INTENT IS EXPLICIT
/// in the type, never inferred from emptiness:
/// - `armament_entity_ids: None` — no override; the stance fights with the
///   DEFAULT wielded set. `Some(vec![])` — deliberately BARE HANDS.
///   `Some(ids)` — override with exactly these item entities.
/// - `action_ids: None` — no bar assignment; adoption leaves the pinned
///   bar alone. `Some(vec![])` — deliberately CLEAR the bar. `Some(ids)`
///   — the bar, in hotkey order.
///
/// Armaments reference concrete ITEM ENTITY ids (never gear asset ids):
/// each override names the exact owned items to wield. Ownership needs no
/// counting — an entity is one thing — and the location invariant drops any
/// referenced item that leaves the wielder. Actions are validated against
/// the stance's candidate set.
#[derive(Debug, Clone, SpacetimeType)]
pub struct StanceCustomization {
    pub stance_id: u32,
    pub armament_entity_ids: Option<Vec<u64>>,
    pub action_ids: Option<Vec<u32>>,
}
