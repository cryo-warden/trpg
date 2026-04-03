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

#[derive(Debug, Clone, SpacetimeType)]
pub struct Decoration {
    pub weight: u8,
    pub blob: EntityBlob,
}

#[table(accessor = location_map_themes)]
pub struct LocationMapTheme {
    #[primary_key]
    pub id: u32,
    pub decorations: Vec<Decoration>,
    pub min_decoration_count: u8,
    pub max_decoration_count: u8,
}

impl LocationMapTheme {
    fn decorate(&self, room: &EntityHandle, rng: &mut StdRng) {
        let decoration_count = rng.next_u32()
            % (self.max_decoration_count - self.min_decoration_count) as u32
            + self.min_decoration_count as u32;

        for _ in 0..decoration_count {
            let e = room.ecs().new();
            // WIP Sample decoration by weight.
            let d = self.decorations[0].to_owned();
            e.instantiate_blob(d.blob);
            e.insert_new_location(room.entity_id());
        }
    }
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

pub struct MapGenerationResult {
    pub main_room_ids: Vec<u64>,
    pub extra_room_ids: Vec<u64>,
}
impl LocationMap {
    pub fn generate_entities(&self, ecs: Ecs) -> MapGenerationResult {
        match self.layout {
            Layout::Path => self.generate_path_layout(ecs),
            // WIP Create hub generation algorithm.
            Layout::Hub => self.generate_path_layout(ecs),
        }
    }
    fn rng(&self) -> StdRng {
        StdRng::seed_from_u64(self.rng_seed.unwrap_or_default())
    }
    fn generate_path_layout(&self, ecs: Ecs) -> MapGenerationResult {
        let theme = if let Some(theme) = ecs.db.location_map_themes().id().find(self.theme_id) {
            theme
        } else {
            return MapGenerationResult {
                main_room_ids: vec![],
                extra_room_ids: vec![],
            };
        };

        let location_map_entity = ecs.new();
        let location_map_entity_id = location_map_entity.entity_id();

        let mut rng = self.rng();
        let Self {
            main_room_count,
            extra_room_count,
            ..
        } = *self;
        let total_room_count = main_room_count + extra_room_count;

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

        // Decorate after other steps so that decoration changes do not impact rng.
        for r in &room_handles {
            theme.decorate(r, &mut rng);
        }

        // WIP
        MapGenerationResult {
            main_room_ids: room_handles.iter().map(|h| h.entity_id()).collect(),
            extra_room_ids: vec![],
        }
    }
}
