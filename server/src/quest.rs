use ecs::Ecs;
use spacetimedb::{
    rand::{rngs::StdRng, seq::SliceRandom, SeedableRng},
    table, SpacetimeType, Table,
};

use crate::asset::location_map::{LocationMap, MapGenerationResult, RoomRole};
use crate::asset::rng_range::RngRange;
use crate::bitset::Bitset;
use crate::ecs_extension::EcsExtension;
use crate::entity::*;
use crate::item::{ItemRef, QuestItemRef};

/// One entity's progress through one quest: a JOIN row (many quests per
/// entity) holding the ordered bitset — for cookie quests, bit index =
/// cookie index; the computed stat contribution scales with the popcount.
/// Public: the client reads its own bits to decide which quest items
/// still smell fresh. (Join naming principle: sides joined, then the
/// relation's semantics — entities x quests, progress.)
#[table(accessor = entities_quests_progress, public)]
pub struct EntitiesQuestsProgress {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub entity_id: u64,
    #[index(btree)]
    pub quest_id: u32,
    pub bits: Bitset,
}

/// Turns ON one bit of an entity's quest progress — creating the join row
/// on first touch — and dirties the quest stat cache. Returns false when
/// the bit was already set: nothing changed, nothing re-derives (and the
/// caller's effect reads as refused — the cookie smelled off).
pub fn set_quest_bit(ecs: Ecs, entity_id: u64, quest_id: u32, index: u32) -> bool {
    let existing = ecs
        .db
        .entities_quests_progress()
        .entity_id()
        .filter(entity_id)
        .find(|row| row.quest_id == quest_id);
    match existing {
        Some(mut row) => {
            if row.bits.is_set(index) {
                return false;
            }
            row.bits.set(index);
            ecs.db.entities_quests_progress().id().update(row);
        }
        None => {
            let mut bits = Bitset::new();
            bits.set(index);
            ecs.db
                .entities_quests_progress()
                .insert(EntitiesQuestsProgress {
                    id: 0,
                    entity_id,
                    quest_id,
                    bits,
                });
        }
    }
    let flags = ecs.db.quest_stat_block_dirty_flag_components();
    if flags.entity_id().find(entity_id).is_none() {
        flags.insert(FlagComponent { entity_id });
    }
    true
}

/// One quest's spawn window in one map (a column on LocationMap): the bit
/// indexes GUARANTEED to appear in every instance of that map, and the
/// window of indexes that merely MAY. Both are Bitsets — the same
/// primitive the progress rows use. Windows overlap across maps on
/// purpose, guaranteed included — the bit, not the item, is the supply,
/// so duplicate spawns are safe (they render stinky to anyone already
/// holding the bit).
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestSpawn {
    pub quest_id: u32,
    /// The spawned item's presentation (appearance and the like); the
    /// application stamps each spawned index's QuestItem ref onto a copy.
    pub item_blob: EntityBlob,
    pub guaranteed_indexes: Bitset,
    pub eligible_indexes: Bitset,
    /// How many indexes to draw from eligible_indexes per instance,
    /// without replacement — a half-open count range like the theme's
    /// encounter and container counts.
    pub min_eligible_count: u8,
    pub max_eligible_count: u8,
}

/// Distinguishes the quest layer's rng stream from generation's: both
/// derive from the map's seed, and sharing a stream would correlate the
/// draws.
const QUEST_SPAWN_RNG_STREAM: u64 = u64::from_le_bytes(*b"questspn");

/// A quest spawn's index window, split from the item's presentation blob:
/// the pure, testable half of spawn selection.
struct SpawnWindow<'a> {
    guaranteed_indexes: &'a Bitset,
    eligible_indexes: &'a Bitset,
    min_eligible_count: u8,
    max_eligible_count: u8,
}

impl QuestSpawn {
    fn window(&self) -> SpawnWindow<'_> {
        SpawnWindow {
            guaranteed_indexes: &self.guaranteed_indexes,
            eligible_indexes: &self.eligible_indexes,
            min_eligible_count: self.min_eligible_count,
            max_eligible_count: self.max_eligible_count,
        }
    }
}

/// The indexes one map instance spawns: every guaranteed index, plus a
/// sampled draw from the eligible window (minus any index this map
/// already guarantees — one map never doubles its own supply), without
/// replacement.
fn choose_spawn_indexes(rng: &mut StdRng, window: &SpawnWindow) -> Vec<u32> {
    let mut indexes: Vec<u32> = window.guaranteed_indexes.ones().collect();
    let mut eligible: Vec<u32> = window
        .eligible_indexes
        .ones()
        .filter(|&index| !window.guaranteed_indexes.is_set(index))
        .collect();
    eligible.shuffle(rng);
    let count: usize = rng.get_range(window.min_eligible_count, window.max_eligible_count);
    indexes.extend(eligible.into_iter().take(count));
    indexes
}

/// Where quest items may land, in preference order: inside generated
/// containers, on the floor of side branches and the ending room, then —
/// only when a map has none of those left — any non-entrance room, then
/// the entrance itself as the last resort (guaranteed supply must spawn).
fn spawn_spots(result: &MapGenerationResult) -> Vec<u64> {
    let mut spots: Vec<u64> = result
        .containers
        .iter()
        .map(|container| container.entity_id)
        .collect();
    spots.extend(
        result
            .rooms
            .iter()
            .filter(|room| matches!(room.role, RoomRole::Side | RoomRole::Ending))
            .map(|room| room.entity_id),
    );
    if spots.is_empty() {
        spots.extend(
            result
                .rooms
                .iter()
                .filter(|room| room.role != RoomRole::Entrance)
                .map(|room| room.entity_id),
        );
    }
    if spots.is_empty() {
        spots.extend(result.rooms.iter().map(|room| room.entity_id));
    }
    spots
}

/// Consuming a spot removes its ROOM from the result — and every
/// container standing in that room — so later spawns (further quests,
/// then encounters) no longer see it. A spot may be a room or a container
/// in one; the entrance is never consumed (it must survive as the safe
/// checkpoint room and every layer's last-resort floor).
fn consume_spot(result: &mut MapGenerationResult, spot: u64) {
    let room_entity_id = result
        .containers
        .iter()
        .find(|container| container.entity_id == spot)
        .map(|container| container.room_entity_id)
        .unwrap_or(spot);
    result.rooms.retain(|room| {
        room.entity_id != room_entity_id || room.role == RoomRole::Entrance
    });
    result
        .containers
        .retain(|container| container.room_entity_id != room_entity_id);
}

/// The quest APPLICATION layer: consumes a role-tagged generation result
/// and injects the map's declared quest items into it, REDUCING the
/// result as it goes — each placement removes its room from the result
/// passed forward, so subsequent quests (and the encounter layer after
/// them) draw from what remains. Generation itself never sees quests;
/// this runs after it, over its output (see materialize_map).
pub fn apply_quest_spawns(
    ecs: Ecs,
    map: &LocationMap,
    result: &mut MapGenerationResult,
) -> Result<(), String> {
    if map.quest_spawns.is_empty() {
        return Ok(());
    }
    let mut rng =
        StdRng::seed_from_u64(map.rng_seed.unwrap_or_default() ^ QUEST_SPAWN_RNG_STREAM);
    for spawn in &map.quest_spawns {
        for index in choose_spawn_indexes(&mut rng, &spawn.window()) {
            let spots = spawn_spots(result);
            let Some(&spot) =
                spots.get(rng.get_range::<u32, usize>(0, spots.len() as u32))
            else {
                continue;
            };
            let mut blob = spawn.item_blob.clone();
            blob.item = Some(ItemComponentBlob {
                item_ref: ItemRef::QuestItem(QuestItemRef {
                    quest_id: spawn.quest_id,
                    index,
                }),
            });
            ecs.new()
                .instantiate_blob(blob, &ecs.instantiation_scope())?
                .insert_new_location(spot);
            consume_spot(result, spot);
        }
    }
    Ok(())
}

/// An entity ceasing to exist takes its quest progress with it. Called
/// wherever entities are actually deleted, like visited-location rows.
pub fn cleanup_quest_rows(ecs: Ecs, entity_id: u64) {
    let row_ids: Vec<u64> = ecs
        .db
        .entities_quests_progress()
        .entity_id()
        .filter(entity_id)
        .map(|row| row.id)
        .collect();
    for row_id in row_ids {
        ecs.db.entities_quests_progress().id().delete(row_id);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::asset::location_map::{GeneratedContainer, GeneratedRoom};

    fn window<'a>(guaranteed: &'a Bitset, eligible: &'a Bitset) -> SpawnWindow<'a> {
        SpawnWindow {
            guaranteed_indexes: guaranteed,
            eligible_indexes: eligible,
            min_eligible_count: 1,
            max_eligible_count: 3,
        }
    }

    #[test]
    fn guaranteed_indexes_always_spawn_and_never_double() {
        let guaranteed = Bitset::from_indexes([0, 1]);
        let eligible = Bitset::from_indexes([0, 1, 2, 3, 4]);
        for seed in 0..200u64 {
            let mut rng = StdRng::seed_from_u64(seed);
            let indexes = choose_spawn_indexes(&mut rng, &window(&guaranteed, &eligible));
            assert!(indexes.contains(&0) && indexes.contains(&1), "seed {seed}");
            assert_eq!(
                indexes.iter().filter(|&&i| i == 0).count(),
                1,
                "seed {seed}: a map never doubles its own guaranteed supply"
            );
        }
    }

    #[test]
    fn eligible_draws_stay_in_the_window_and_count_range() {
        let guaranteed = Bitset::from_indexes([0, 1]);
        let eligible = Bitset::from_indexes([0, 1, 2, 3, 4]);
        for seed in 0..200u64 {
            let mut rng = StdRng::seed_from_u64(seed);
            let indexes = choose_spawn_indexes(&mut rng, &window(&guaranteed, &eligible));
            let drawn: Vec<u32> =
                indexes.iter().copied().filter(|&i| i > 1).collect();
            // Half-open count range [1, 3): one or two eligible draws.
            assert!((1..=2).contains(&drawn.len()), "seed {seed}: {drawn:?}");
            assert!(
                drawn.iter().all(|&i| eligible.is_set(i)),
                "seed {seed}: {drawn:?}"
            );
            let mut deduped = drawn.clone();
            deduped.sort_unstable();
            deduped.dedup();
            assert_eq!(deduped.len(), drawn.len(), "seed {seed}: replacement draw");
        }
    }

    fn room(entity_id: u64, role: RoomRole) -> GeneratedRoom {
        GeneratedRoom { entity_id, role }
    }

    fn four_room_result() -> MapGenerationResult {
        MapGenerationResult {
            rooms: vec![
                room(1, RoomRole::Entrance),
                room(2, RoomRole::Main),
                room(3, RoomRole::Ending),
                room(4, RoomRole::Side),
            ],
            checkpoint_room_entity_ids: vec![1],
            containers: vec![GeneratedContainer {
                entity_id: 9,
                room_entity_id: 4,
                room_role: RoomRole::Side,
            }],
        }
    }

    #[test]
    fn spots_prefer_containers_and_rewarding_rooms() {
        assert_eq!(spawn_spots(&four_room_result()), vec![9, 3, 4]);
    }

    #[test]
    fn consuming_a_container_spot_removes_its_room_and_siblings() {
        let mut result = four_room_result();
        consume_spot(&mut result, 9);
        assert!(result.containers.is_empty());
        assert!(result.rooms.iter().all(|r| r.entity_id != 4));
        // The rest of the result is untouched.
        assert_eq!(result.rooms.len(), 3);
        assert_eq!(spawn_spots(&result), vec![3]);
    }

    #[test]
    fn the_entrance_survives_consumption() {
        let mut result = four_room_result();
        for spot in [9, 3, 2, 1] {
            consume_spot(&mut result, spot);
        }
        assert_eq!(result.rooms.len(), 1);
        assert_eq!(result.rooms[0].role, RoomRole::Entrance);
        // The last-resort floor: spots still resolve somewhere.
        assert_eq!(spawn_spots(&result), vec![1]);
    }

    #[test]
    fn spots_fall_back_rather_than_vanish() {
        let no_rewards = MapGenerationResult {
            rooms: vec![room(1, RoomRole::Entrance), room(2, RoomRole::Main)],
            checkpoint_room_entity_ids: vec![],
            containers: vec![],
        };
        assert_eq!(spawn_spots(&no_rewards), vec![2]);
        let entrance_only = MapGenerationResult {
            rooms: vec![room(1, RoomRole::Entrance)],
            checkpoint_room_entity_ids: vec![],
            containers: vec![],
        };
        assert_eq!(spawn_spots(&entrance_only), vec![1]);
    }
}
