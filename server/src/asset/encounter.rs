use ecs::Ecs;
use spacetimedb::table;

use crate::{
    ecs_extension::EcsExtension,
    entity::{
        EntityBlob, EntityHandle, InstantiateEntityBlob, LocationKind, NewEntityHandle,
        WithEntityHandle, __location__Option,
    },
};

#[table(accessor = encounter_blobs)]
pub struct EncounterBlob {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub blob: EntityBlob,
}

#[table(accessor = encounters)]
pub struct Encounter {
    #[primary_key]
    pub id: u32,
    #[unique]
    pub name: String,
    pub categoric_blob_id: u32,
    pub blob_ids: Vec<u32>,
}

impl Encounter {
    /// Spawns the encounter's blobs into the room and returns the spawned
    /// entity ids, so callers (the quest room-claim layer) can stamp
    /// claim-specific components onto exactly what was created.
    pub fn populate(&self, room: &EntityHandle) -> Result<Vec<u64>, String> {
        let ecs: Ecs = room.ecs();
        // TODO Make it easier to grab a default empty EntityBlob.
        let categoric_blob =
            if let Some(c) = ecs.db.encounter_blobs().id().find(self.categoric_blob_id) {
                c.blob
            } else {
                return Ok(Vec::new());
            };
        log::debug!(
            "Grabbed categoric_blob {} {:?}",
            self.categoric_blob_id,
            categoric_blob
        );
        let scope = ecs.instantiation_scope();
        let mut spawned_entity_ids: Vec<u64> = Vec::new();
        for id in &self.blob_ids {
            if let Some(e) = ecs.db.encounter_blobs().id().find(id) {
                let spawn = ecs
                    .new()
                    .instantiate_blob(categoric_blob.clone(), &scope)?
                    .instantiate_blob(e.blob, &scope)?;
                spawned_entity_ids.push(spawn.entity_id());
                spawn.upsert_new_location(room.entity_id(), LocationKind::Interior);
            }
        }
        Ok(spawned_entity_ids)
    }
}
