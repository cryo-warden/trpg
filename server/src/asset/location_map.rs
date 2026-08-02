use crate::{
    asset::{
        encounter::encounters,
        location_map_theme::location_map_themes,
        rng_range::RngRange,
        weighted_sampler::{WeightedSample, WeightedSampler},
    },
    ecs_extension::EcsExtension,
    entity::*,
};
use ecs::Ecs;
use spacetimedb::{
    rand::{rngs::StdRng, seq::SliceRandom, SeedableRng},
    table, SpacetimeType,
};

#[derive(Debug, Clone, SpacetimeType)]
pub enum Layout {
    Path,
    Hub,
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EncounterIdSample {
    weight: u8,
    id: u32,
}

impl WeightedSample for EncounterIdSample {
    type Result = u32;
    fn value(&self) -> &Self::Result {
        &self.id
    }
    fn weight(&self) -> super::weighted_sampler::Weight {
        self.weight as u32
    }
}

#[derive(Debug, Clone, SpacetimeType)]
pub struct EncounterIdsSampler {
    selections: Vec<EncounterIdSample>,
}

impl WeightedSampler for EncounterIdsSampler {
    type Result = u32;
    type Sample = EncounterIdSample;
    fn selections(&self) -> &Vec<Self::Sample> {
        &self.selections
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
    pub encounter_ids_sampler: EncounterIdsSampler,
    pub min_encounter_count: u8,
    pub max_encounter_count: u8,
}

#[table(accessor = location_map_connections)]
pub struct LocationMapConnection {
    #[primary_key]
    pub id: u32,
    pub exit_location_map_id: u32,
    pub destination_location_map_id: u32,
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
                let r = theme.rooms_selector.sample(&mut rng);
                ecs.new_room(r.to_owned(), location_map_entity_id)
            })
            .collect();

        for i in 0..(main_room_count as usize - 1) {
            let a = &room_handles[i];
            let b = &room_handles[i + 1];
            let p = theme.paths_selector.sample(&mut rng);
            ecs.new_path(p.to_owned(), a.entity_id(), b.entity_id());
            ecs.new_path(p.to_owned(), b.entity_id(), a.entity_id());
        }

        for i in (main_room_count)..(total_room_count) {
            let a = &room_handles[i as usize];
            let b = &room_handles[rng.get_range::<u8, usize>(0, i)];
            let p = theme.paths_selector.sample(&mut rng);
            ecs.new_path(p.to_owned(), a.entity_id(), b.entity_id());
            ecs.new_path(p.to_owned(), b.entity_id(), a.entity_id());
        }

        // Loop edges: the main rooms form a linear chain, so connecting a room
        // to the one two steps further along the chain closes a 3-room cycle (a
        // triangle) within this map. `loop_count` controls how many such loops
        // are added, turning the map from a pure tree into a graph with cycles.
        // (This is intra-map only; it is unrelated to cross-map connections.)
        if main_room_count >= 3 {
            for _ in 0..self.loop_count {
                let a_index: usize = rng.get_range::<u8, usize>(0, main_room_count - 2);
                let a = &room_handles[a_index];
                let b = &room_handles[a_index + 2];
                let p = theme.paths_selector.sample(&mut rng);
                ecs.new_path(p.to_owned(), a.entity_id(), b.entity_id());
                ecs.new_path(p.to_owned(), b.entity_id(), a.entity_id());
            }
        }

        // TODO Move encounter spawning to a system responding to player movement.
        let encounter_count: usize =
            rng.get_range(self.min_encounter_count, self.max_encounter_count);
        let mut encounter_room_handles: Vec<_> =
            room_handles.iter().take(encounter_count).collect();
        encounter_room_handles.shuffle(&mut rng);
        for r in encounter_room_handles {
            if let Some(encounter) = ecs
                .db
                .encounters()
                .id()
                .find(self.encounter_ids_sampler.sample(&mut rng))
            {
                encounter.populate(&r);
            }
        }

        // Decorate after other steps so that decoration changes do not impact rng.
        for r in &room_handles {
            theme.decorate(r, &mut rng);
        }

        let main_room_count = main_room_count as usize;
        MapGenerationResult {
            main_room_ids: room_handles[..main_room_count]
                .iter()
                .map(|h| h.entity_id())
                .collect(),
            extra_room_ids: room_handles[main_room_count..]
                .iter()
                .map(|h| h.entity_id())
                .collect(),
        }
    }
}
