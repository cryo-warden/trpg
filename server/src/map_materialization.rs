//! The materialization PIPELINE above map generation. Generation is
//! quest-agnostic: it builds the map's shape (rooms, paths, decorations,
//! containers, the checkpoint) and returns a role-tagged
//! MapGenerationResult. The layers here then run in order, each CONSUMING
//! from the result it passes forward:
//!
//!   1. generate_entities — shape only, no inhabitants
//!   2. apply_quest_spawns — each quest in turn places its items and
//!      removes the rooms it consumed from the result
//!   3. apply_encounters — last, drawing only from what remains
//!
//! Runtime demand for a map instance goes through materialize_map, never
//! through generate_entities directly.

use crate::asset::encounter::encounters;
use crate::asset::location_map::{LocationMap, MapGenerationResult, RoomRole};
use crate::asset::rng_range::RngRange;
use crate::asset::weighted_sampler::WeightedSampler;
use crate::entity::*;
use ecs::Ecs;
use spacetimedb::rand::{rngs::StdRng, seq::SliceRandom, SeedableRng};

pub fn materialize_map(ecs: Ecs, map: &LocationMap) -> Result<MapGenerationResult, String> {
    let mut result = map.generate_entities(ecs)?;
    crate::quest::apply_quest_spawns(ecs, map, &mut result)?;
    apply_encounters(ecs, map, &result)?;
    Ok(result)
}

/// Distinguishes the encounter layer's rng stream from generation's and
/// the quest layer's: all derive from the map's seed, and sharing a
/// stream would correlate the draws.
const ENCOUNTER_RNG_STREAM: u64 = u64::from_le_bytes(*b"encountr");

// TODO Move encounter spawning to a system responding to player movement.
/// The LAST pipeline stage: populates sampled encounters into the rooms
/// the earlier layers left unconsumed. The entrance never hosts one — it
/// is the map's guaranteed checkpoint room, so waking from the
/// death-trance is always safe.
fn apply_encounters(
    ecs: Ecs,
    map: &LocationMap,
    result: &MapGenerationResult,
) -> Result<(), String> {
    let mut rng =
        StdRng::seed_from_u64(map.rng_seed.unwrap_or_default() ^ ENCOUNTER_RNG_STREAM);
    let encounter_count: usize =
        rng.get_range(map.min_encounter_count, map.max_encounter_count);
    let mut room_ids: Vec<u64> = result
        .rooms
        .iter()
        .filter(|room| room.role != RoomRole::Entrance)
        .map(|room| room.entity_id)
        .collect();
    room_ids.shuffle(&mut rng);
    for room_id in room_ids.into_iter().take(encounter_count) {
        if let Some(encounter_id) = map.encounter_ids_sampler.sample(&mut rng) {
            if let Some(encounter) = ecs.db.encounters().id().find(*encounter_id) {
                encounter.populate(&ecs.find(room_id))?;
            }
        }
    }
    Ok(())
}
