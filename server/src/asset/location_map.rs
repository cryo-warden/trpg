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
    pub weight: u8,
    pub id: u32,
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
    pub selections: Vec<EncounterIdSample>,
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
    #[unique]
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
    pub fn generate_entities(&self, ecs: Ecs) -> Result<MapGenerationResult, String> {
        match self.layout {
            Layout::Path => self.generate_path_layout(ecs),
            // WIP Create hub generation algorithm.
            Layout::Hub => self.generate_path_layout(ecs),
        }
    }
    fn rng(&self) -> StdRng {
        StdRng::seed_from_u64(self.rng_seed.unwrap_or_default())
    }
    fn generate_path_layout(&self, ecs: Ecs) -> Result<MapGenerationResult, String> {
        let theme = if let Some(theme) = ecs.db.location_map_themes().id().find(self.theme_id) {
            theme
        } else {
            return Ok(MapGenerationResult {
                main_room_ids: vec![],
                extra_room_ids: vec![],
            });
        };

        let location_map_entity = ecs.new();
        let location_map_entity_id = location_map_entity.entity_id();

        let mut rng = self.rng();
        let Self {
            main_room_count,
            extra_room_count,
            ..
        } = *self;
        let total_room_count = main_room_count as usize + extra_room_count as usize;

        // Rooms: skip any the (possibly empty) selector cannot fill. A theme
        // offering no room blob simply yields no rooms rather than panicking.
        let mut room_handles: Vec<EntityHandle> = Vec::new();
        for _ in 0..total_room_count {
            if let Some(r) = theme.rooms_selector.sample(&mut rng) {
                room_handles.push(ecs.new_room(r.to_owned(), location_map_entity_id)?);
            }
        }
        let room_count = room_handles.len();
        // Clamp the main/extra split to the rooms actually produced.
        let main_room_count = (main_room_count as usize).min(room_count);

        // Main-path chain, connecting consecutive main rooms.
        for i in 0..main_room_count.saturating_sub(1) {
            if let Some(p) = theme.paths_selector.sample(&mut rng) {
                let (a, b) = (room_handles[i].entity_id(), room_handles[i + 1].entity_id());
                ecs.new_path(p.to_owned(), a, b)?;
                ecs.new_path(p.to_owned(), b, a)?;
            }
        }

        // Extra rooms attach back to a random earlier room.
        for i in main_room_count..room_count {
            if let Some(p) = theme.paths_selector.sample(&mut rng) {
                let a = room_handles[i].entity_id();
                let b = room_handles[rng.get_range::<u32, usize>(0, i as u32)].entity_id();
                ecs.new_path(p.to_owned(), a, b)?;
                ecs.new_path(p.to_owned(), b, a)?;
            }
        }

        // Loop edges: the main rooms form a linear chain, so connecting a room
        // to the one two steps further along the chain closes a 3-room cycle (a
        // triangle) within this map. `loop_count` controls how many such loops
        // are added, turning the map from a pure tree into a graph with cycles.
        // (This is intra-map only; it is unrelated to cross-map connections.)
        if main_room_count >= 3 {
            for _ in 0..self.loop_count {
                let a_index: usize =
                    rng.get_range::<u32, usize>(0, (main_room_count - 2) as u32);
                if let Some(p) = theme.paths_selector.sample(&mut rng) {
                    let a = room_handles[a_index].entity_id();
                    let b = room_handles[a_index + 2].entity_id();
                    ecs.new_path(p.to_owned(), a, b)?;
                    ecs.new_path(p.to_owned(), b, a)?;
                }
            }
        }

        // TODO Move encounter spawning to a system responding to player movement.
        let encounter_count: usize =
            rng.get_range(self.min_encounter_count, self.max_encounter_count);
        let mut encounter_room_handles: Vec<_> =
            room_handles.iter().take(encounter_count).collect();
        encounter_room_handles.shuffle(&mut rng);
        for r in encounter_room_handles {
            if let Some(encounter_id) = self.encounter_ids_sampler.sample(&mut rng) {
                if let Some(encounter) = ecs.db.encounters().id().find(*encounter_id) {
                    encounter.populate(r)?;
                }
            }
        }

        // Decorate after other steps so that decoration changes do not impact rng.
        for r in &room_handles {
            theme.decorate(r, &mut rng)?;
        }

        Ok(MapGenerationResult {
            main_room_ids: room_handles[..main_room_count]
                .iter()
                .map(|h| h.entity_id())
                .collect(),
            extra_room_ids: room_handles[main_room_count..]
                .iter()
                .map(|h| h.entity_id())
                .collect(),
        })
    }
}
