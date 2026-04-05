use ecs::Ecs;
use spacetimedb::table;

use crate::{
    entity::{EntityBlob, EntityHandle, NewEntityHandle, WithEntityHandle, __location__Option},
    entity_handle_extension::InstantiateEntityBlobExtension,
};

#[table(accessor = encounter_blobs)]
pub struct EncounterBlob {
    #[primary_key]
    pub id: u32,
    pub blob: EntityBlob,
}

#[table(accessor = encounters)]
pub struct Encounter {
    #[primary_key]
    pub id: u32,
    pub blob_ids: Vec<u32>,
}

impl Encounter {
    pub fn populate(&self, room: &EntityHandle) {
        let ecs: Ecs = room.ecs();
        for id in &self.blob_ids {
            if let Some(e) = ecs.db.encounter_blobs().id().find(id) {
                ecs.new()
                    .instantiate_blob_dirty(e.blob)
                    .upsert_new_location(room.entity_id());
            }
        }
    }
}
