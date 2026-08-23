use spacetimedb::table;

use crate::entity::EntityBlob;

/// A gear TEMPLATE: a fully resolved entity blob (carrying its item KIND, its
/// Equippable GRANT, and its own appearance) instantiated per-player into an
/// owned item entity at provisioning — never a shared world entity. Gear is an
/// entity like anything else; this is just the name-keyed store of the resolved
/// blob so provisioning can spawn owned copies and creatures can reference it by
/// name for their summed NPC equipment. Not public: the client reads an item's
/// stats from its own equippable_components and its name/look from its
/// appearance features, never from a gear asset table.
#[table(accessor = gear_blobs)]
pub struct GearBlob {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub blob: EntityBlob,
}
