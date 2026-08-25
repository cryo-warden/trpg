use ecs::Ecs;
use spacetimedb::table;

use crate::entity::EntityBlob;

/// The ONE name-keyed store of resolved entity-blob TEMPLATES. Every authored
/// blob — gear, encounter members, decorations/rooms/checkpoints/containers/
/// paths, quest items, the new-player blob, and the world entities instantiated
/// at push — lands here, keyed by name (unique) and by a stable id. The server
/// treats them all identically; the "kind" of a blob is purely an authoring
/// convenience on the client. Cross-references (a creature's armament_names, an
/// encounter's blob_ids, a theme sampler's blob_id, a quest's item_blob_id) all
/// resolve by NAME into this one table's ids at push, and are fetched by id at
/// spawn/generation time. Not public: the client reads an entity's stats/look
/// from its own component tables, never from this asset store.
#[table(accessor = entity_blob_assets)]
pub struct EntityBlobAssetRow {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub blob: EntityBlob,
}

/// Fetch a resolved blob TEMPLATE by its unified-table id, cloning it out for
/// instantiation. Loud on a dangling id: push validates every reference, so a
/// miss at spawn/generation time is a bug, never a silent skip (silently
/// skipping would desync rng-driven generation).
pub fn find_entity_blob(ecs: Ecs, id: u32) -> Result<EntityBlob, String> {
    ecs.db
        .entity_blob_assets()
        .id()
        .find(id)
        .map(|row| row.blob)
        .ok_or_else(|| format!("Entity blob asset id {} not found.", id))
}
