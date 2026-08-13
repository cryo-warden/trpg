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

/// Where a connection attaches inside a generated map.
#[derive(Debug, Clone, SpacetimeType)]
pub enum ConnectionAnchor {
    /// The first main room.
    Entrance,
    /// The last main room.
    Ending,
    /// A random main-chain room.
    Edge,
    /// A random branched (extra) room; falls back to a main room when the
    /// map generated no extras.
    Branch,
}

/// A DIRECTED cross-map connection (both-ways authoring expands to two rows
/// at push): from the exit map's anchor room, a path materializes into the
/// destination map's anchor room — lazily, when a player stands in the
/// anchor room (the demand predicate).
#[table(accessor = location_map_connections)]
pub struct LocationMapConnection {
    #[primary_key]
    pub id: u32,
    pub exit_location_map_id: u32,
    pub destination_location_map_id: u32,
    pub exit_anchor: ConnectionAnchor,
    pub destination_anchor: ConnectionAnchor,
}

/// The room a ConnectionAnchor selects within a generated (or recorded)
/// room layout, or None for an empty map.
pub fn resolve_anchor_room(
    main_room_entity_ids: &[u64],
    extra_room_entity_ids: &[u64],
    anchor: &ConnectionAnchor,
    rng: &mut StdRng,
) -> Option<u64> {
    match anchor {
        ConnectionAnchor::Entrance => main_room_entity_ids.first().copied(),
        ConnectionAnchor::Ending => main_room_entity_ids.last().copied(),
        ConnectionAnchor::Edge => {
            if main_room_entity_ids.is_empty() {
                None
            } else {
                let index: usize =
                    rng.get_range::<u32, usize>(0, (main_room_entity_ids.len() - 1) as u32);
                main_room_entity_ids.get(index).copied()
            }
        }
        ConnectionAnchor::Branch => {
            if let Some(&room) = extra_room_entity_ids.first() {
                // Deterministically varied would be nicer; any branch room
                // serves the fiction.
                let index: usize =
                    rng.get_range::<u32, usize>(0, (extra_room_entity_ids.len() - 1) as u32);
                extra_room_entity_ids.get(index).copied().or(Some(room))
            } else {
                resolve_anchor_room(
                    main_room_entity_ids,
                    &[],
                    &ConnectionAnchor::Edge,
                    rng,
                )
            }
        }
    }
}

pub struct MapGenerationResult {
    pub main_room_ids: Vec<u64>,
    pub extra_room_ids: Vec<u64>,
    pub checkpoint_room_entity_ids: Vec<u64>,
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
                checkpoint_room_entity_ids: vec![],
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
        // The entrance (room 0) is the map's guaranteed checkpoint room:
        // encounters never spawn there, so waking from the death-trance is
        // always safe.
        let encounter_count: usize =
            rng.get_range(self.min_encounter_count, self.max_encounter_count);
        let mut encounter_room_handles: Vec<_> = room_handles
            .iter()
            .skip(1)
            .take(encounter_count)
            .collect();
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

        // The entrance's visible checkpoint: one themed fortune-telling
        // object to attune to. Placed last for the same rng-stability
        // reason as decorations. The object carries its abstract binding
        // (this map asset + index), and the map instance records its
        // identity and checkpoint rooms so respawn/teleport resolution can
        // find them — or regenerate the map — later.
        let mut checkpoint_room_entity_ids: Vec<u64> = Vec::new();
        if let Some(entrance) = room_handles.first() {
            if let Some(checkpoint_blob) = theme.checkpoints_selector.sample(&mut rng) {
                checkpoint_room_entity_ids.push(entrance.entity_id());
                ecs.new()
                    .instantiate_blob(
                        checkpoint_blob.to_owned(),
                        &ecs.instantiation_scope(),
                    )?
                    .upsert_new_location(entrance.entity_id())
                    .into_handle()
                    .upsert_new_checkpoint_binding(
                        self.id,
                        (checkpoint_room_entity_ids.len() - 1) as u32,
                    );
            }
        }
        let main_room_entity_ids: Vec<u64> = room_handles[..main_room_count]
            .iter()
            .map(|h| h.entity_id())
            .collect();
        let extra_room_entity_ids: Vec<u64> = room_handles[main_room_count..]
            .iter()
            .map(|h| h.entity_id())
            .collect();
        location_map_entity
            .clone()
            .upsert_new_map_instance(self.id)
            .into_handle()
            .clone()
            .upsert_new_map_checkpoints(checkpoint_room_entity_ids.clone())
            .into_handle()
            .upsert_new_map_rooms(
                main_room_entity_ids.clone(),
                extra_room_entity_ids.clone(),
            );

        // Seed the anchors: every connection LEAVING this map attaches, as
        // pending, to its resolved anchor room. A player standing there
        // later demands the far map and the path materializes.
        use spacetimedb::Table as _;
        for connection in ecs.db.location_map_connections().iter() {
            if connection.exit_location_map_id != self.id {
                continue;
            }
            if let Some(anchor_room) = resolve_anchor_room(
                &main_room_entity_ids,
                &extra_room_entity_ids,
                &connection.exit_anchor,
                &mut rng,
            ) {
                let room = ecs.find(anchor_room);
                let mut connection_ids = { room.pending_connections() }
                    .map(|c| c.connection_ids)
                    .unwrap_or_default();
                connection_ids.push(connection.id);
                room.upsert_new_pending_connections(connection_ids);
            }
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
            checkpoint_room_entity_ids,
        })
    }
}
