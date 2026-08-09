use ecs::Ecs;
use spacetimedb::table;

use crate::{
    ecs_extension::EcsExtension,
    entity::{
        EntityBlob, EntityHandle, InstantiateEntityBlob, NewEntityHandle, WithEntityHandle,
        __location__Option,
    },
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
    pub categoric_blob_id: u32,
    pub blob_ids: Vec<u32>,
}

impl Encounter {
    pub fn populate(&self, room: &EntityHandle) -> Result<(), String> {
        let ecs: Ecs = room.ecs();
        // TODO Make it easier to grab a default empty EntityBlob.
        let categoric_blob =
            if let Some(c) = ecs.db.encounter_blobs().id().find(self.categoric_blob_id) {
                c.blob
            } else {
                return Ok(());
            };
        log::debug!(
            "Grabbed categoric_blob {} {:?}",
            self.categoric_blob_id,
            categoric_blob
        );
        let scope = ecs.instantiation_scope();
        for id in &self.blob_ids {
            if let Some(e) = ecs.db.encounter_blobs().id().find(id) {
                ecs.new()
                    .instantiate_blob(categoric_blob.clone(), &scope)?
                    .instantiate_blob_dirty(e.blob, &scope)?
                    .upsert_new_location(room.entity_id());
            }
        }
        Ok(())
    }
}
