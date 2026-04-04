use spacetimedb::table;

use crate::entity::EntityBlob;

#[table(accessor = encounter_blobs)]
pub struct EncounterBlob {
    pub id: u32,
    pub blob: EntityBlob,
}

#[table(accessor = encounters)]
pub struct Encounter {
    pub id: u32,
    pub blob_ids: Vec<u32>,
}
