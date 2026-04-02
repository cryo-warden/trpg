use crate::{ecs_extension::EcsExtension, entity::*};
use ecs::Ecs;
use spacetimedb::{
    rand::{rngs::StdRng, RngCore, SeedableRng},
    table, SpacetimeType,
};

#[derive(Debug, Clone, SpacetimeType)]
pub enum Layout {
    Path,
    Hub,
}

#[table(accessor = location_maps)]
pub struct LocationMap {
    #[primary_key]
    pub id: u32,
    pub name: String,
    pub theme_id: u32,
    pub layout: Layout,
    pub rng_seed: Option<u64>,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
}

#[allow(dead_code)]
pub struct MapGenerationResult {
    pub main_room_ids: Vec<u64>,
    pub extra_room_ids: Vec<u64>,
}

#[allow(dead_code)]
pub trait LocationMapGenerator {
    fn generate_location_map(&self, ecs: Ecs) -> MapGenerationResult;
}

// WIP Create different room-link algorithm for each Layout.
fn generate_path_layout(
    ecs: Ecs,
    mut rng: StdRng,
    location_map_entity_id: u64,
    main_room_count: u8,
    total_room_count: u8,
) -> MapGenerationResult {
    let room_handles: Vec<EntityHandle> = (0..total_room_count)
        .map(|_| {
            ecs // WIP Use entity blobs to initialize rooms and paths.
                .new_room(vec![], location_map_entity_id)
        })
        .collect();
    for i in 0..(main_room_count as usize - 1) {
        let a = &room_handles[i];
        let b = &room_handles[i + 1];
        ecs.new_path(vec![], a.entity_id(), b.entity_id());
        ecs.new_path(vec![], b.entity_id(), a.entity_id());
    }

    for i in (main_room_count as u32)..(total_room_count as u32) {
        let a = &room_handles[i as usize];
        let b = &room_handles[(rng.next_u32() % i) as usize];
        ecs.new_path(vec![], a.entity_id(), b.entity_id());
        ecs.new_path(vec![], b.entity_id(), a.entity_id());
    }

    // WIP
    MapGenerationResult {
        main_room_ids: room_handles.iter().map(|h| h.entity_id()).collect(),
        extra_room_ids: vec![],
    }
}

impl LocationMapGenerator for LocationMap {
    fn generate_location_map(&self, ecs: Ecs) -> MapGenerationResult {
        generate_path_layout(
            ecs,
            StdRng::seed_from_u64(self.rng_seed.unwrap_or_default()),
            ecs.new().entity_id(),
            self.main_room_count,
            self.main_room_count + self.extra_room_count,
        )
    }
}
