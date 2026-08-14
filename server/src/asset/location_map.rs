use crate::{
    asset::{
        location_map_theme::location_map_themes,
        rng_range::RngRange,
        weighted_sampler::{WeightedSample, WeightedSampler},
    },
    ecs_extension::EcsExtension,
    entity::*,
};
use ecs::Ecs;
use spacetimedb::{
    rand::{rngs::StdRng, SeedableRng},
    table, SpacetimeType,
};

#[derive(Debug, Clone, SpacetimeType)]
pub enum Layout {
    Path,
    Hub,
}

/// How instances of a map are shared and paced. (The recorded per-player
/// instancing design keys off the same distinction: Private maps belong
/// to one player/party; Common zones are shared hubs like towns.)
#[derive(Debug, Clone, Copy, PartialEq, Eq, SpacetimeType)]
pub enum ZoneKind {
    /// Turn-based: actions in an instance advance only while every
    /// non-idle player there has an assigned action (see turn.rs).
    Private,
    /// A shared hub (towns): always realtime, never turn-guarded.
    Common,
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
    pub zone_kind: ZoneKind,
    pub rng_seed: Option<u64>,
    pub extra_room_count: u8,
    pub main_room_count: u8,
    pub loop_count: u8,
    pub encounter_ids_sampler: EncounterIdsSampler,
    pub min_encounter_count: u8,
    pub max_encounter_count: u8,
    /// Which quest indexes spawn in instances of this map. Generation never
    /// reads these — the quest application layer consumes them together
    /// with the role-tagged generation result (see materialize_map).
    pub quest_spawns: Vec<crate::quest::QuestSpawn>,
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

/// Where a generated room sits in the map's shape. This vocabulary is the
/// CONTRACT between generation and the layers consuming its result (quest
/// injection today; treasure and boss placement later): generation reports
/// roles and stays ignorant of why anyone wants them.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RoomRole {
    /// The first main room: the guaranteed-safe checkpoint room.
    Entrance,
    /// A middle room of the main chain.
    Main,
    /// The last main room.
    Ending,
    /// A branched (extra) room hanging off the main chain.
    Side,
}

pub struct GeneratedRoom {
    pub entity_id: u64,
    pub role: RoomRole,
}

/// A themed breakable placed by generation, tagged with where it stands
/// so consumers can pick containers by location kind — and consume the
/// room when they stuff it.
pub struct GeneratedContainer {
    pub entity_id: u64,
    pub room_entity_id: u64,
    /// Today's quest layer takes any container; treasure-room and
    /// boss-adjacent placement will select by this.
    #[allow(dead_code)]
    pub room_role: RoomRole,
}

/// What one generation run produced, role-tagged. Purely in-memory: rooms
/// that must outlive the tick are recorded on the instance's components
/// (MapRoomsComponent, MapCheckpointsComponent), not through this.
pub struct MapGenerationResult {
    pub rooms: Vec<GeneratedRoom>,
    pub checkpoint_room_entity_ids: Vec<u64>,
    pub containers: Vec<GeneratedContainer>,
}

impl MapGenerationResult {
    pub fn entrance_room_id(&self) -> Option<u64> {
        self.rooms
            .iter()
            .find(|room| room.role == RoomRole::Entrance)
            .map(|room| room.entity_id)
    }
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
                rooms: vec![],
                checkpoint_room_entity_ids: vec![],
                containers: vec![],
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

        // (Encounters are NOT generation's business: they are the LAST
        // stage of the materialization pipeline, drawing from whatever
        // rooms the quest layers left unconsumed — see materialize_map.)

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
        // Role-tag every room: the shape vocabulary downstream layers key
        // placement on. Entrance wins over Ending when the chain is one
        // room long — safety beats reward.
        let rooms: Vec<GeneratedRoom> = room_handles
            .iter()
            .enumerate()
            .map(|(i, handle)| GeneratedRoom {
                entity_id: handle.entity_id(),
                role: if i == 0 {
                    RoomRole::Entrance
                } else if i + 1 == main_room_count {
                    RoomRole::Ending
                } else if i < main_room_count {
                    RoomRole::Main
                } else {
                    RoomRole::Side
                },
            })
            .collect();

        // Containers: themed breakables holding whatever downstream layers
        // stuff into them. Placed after every earlier sampling step
        // (appending keeps existing seeds' draws stable) and biased to the
        // rooms exploration rewards — side branches and the far end.
        let mut containers: Vec<GeneratedContainer> = Vec::new();
        let container_count: usize =
            rng.get_range(theme.min_container_count, theme.max_container_count);
        let preferred: Vec<&GeneratedRoom> = rooms
            .iter()
            .filter(|room| matches!(room.role, RoomRole::Side | RoomRole::Ending))
            .collect();
        let fallback: Vec<&GeneratedRoom> = rooms
            .iter()
            .filter(|room| room.role != RoomRole::Entrance)
            .collect();
        let container_rooms = if preferred.is_empty() { fallback } else { preferred };
        if !container_rooms.is_empty() {
            for _ in 0..container_count {
                let room = container_rooms
                    [rng.get_range::<u32, usize>(0, container_rooms.len() as u32)];
                if let Some(container_blob) = theme.containers_selector.sample(&mut rng) {
                    let container = ecs.new().instantiate_blob(
                        container_blob.to_owned(),
                        &ecs.instantiation_scope(),
                    )?;
                    let container_entity_id = container.entity_id();
                    container.insert_new_location(room.entity_id);
                    containers.push(GeneratedContainer {
                        entity_id: container_entity_id,
                        room_entity_id: room.entity_id,
                        room_role: room.role,
                    });
                }
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
            rooms,
            checkpoint_room_entity_ids,
            containers,
        })
    }
}
