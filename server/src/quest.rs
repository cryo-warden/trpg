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
/// window of indexes that merely MAY. Windows overlap across maps on
/// purpose — the bit, not the item, is the supply, so duplicate spawns are
/// safe (they render stinky to anyone already holding the bit).
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestSpawn {
    pub quest_id: u32,
    /// The spawned item's presentation (appearance and the like); the
    /// application stamps each spawned index's QuestItem ref onto a copy.
    pub item_blob: EntityBlob,
    pub guaranteed_indexes: Vec<u32>,
    pub eligible_indexes: Vec<u32>,
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
    guaranteed_indexes: &'a [u32],
    eligible_indexes: &'a [u32],
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
    let mut indexes = window.guaranteed_indexes.to_vec();
    let mut eligible: Vec<u32> = window
        .eligible_indexes
        .iter()
        .copied()
        .filter(|index| !window.guaranteed_indexes.contains(index))
        .collect();
    eligible.shuffle(rng);
    let count: usize = rng.get_range(window.min_eligible_count, window.max_eligible_count);
    indexes.extend(eligible.into_iter().take(count));
    indexes
}

/// Where quest items may land, in preference order: inside generated
/// containers, on the floor of side branches and the ending room, then —
/// only when a map has none of those — any non-entrance room, then any
/// room at all.
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

/// The quest APPLICATION layer: consumes a role-tagged generation result
/// and injects the map's declared quest items into it. Generation itself
/// never sees quests; this runs after it, over its output (see
/// materialize_map).
pub fn apply_quest_spawns(
    ecs: Ecs,
    map: &LocationMap,
    result: &MapGenerationResult,
) -> Result<(), String> {
    if map.quest_spawns.is_empty() {
        return Ok(());
    }
    let spots = spawn_spots(result);
    if spots.is_empty() {
        return Ok(());
    }
    let mut rng =
        StdRng::seed_from_u64(map.rng_seed.unwrap_or_default() ^ QUEST_SPAWN_RNG_STREAM);
    for spawn in &map.quest_spawns {
        for index in choose_spawn_indexes(&mut rng, &spawn.window()) {
            let mut blob = spawn.item_blob.clone();
            blob.item = Some(ItemComponentBlob {
                item_ref: ItemRef::QuestItem(QuestItemRef {
                    quest_id: spawn.quest_id,
                    index,
                }),
            });
            let spot = spots[rng.get_range::<u32, usize>(0, spots.len() as u32)];
            ecs.new()
                .instantiate_blob(blob, &ecs.instantiation_scope())?
                .insert_new_location(spot);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::asset::location_map::{GeneratedContainer, GeneratedRoom};

    const WINDOW: SpawnWindow<'static> = SpawnWindow {
        guaranteed_indexes: &[0, 1],
        eligible_indexes: &[0, 1, 2, 3, 4],
        min_eligible_count: 1,
        max_eligible_count: 3,
    };

    #[test]
    fn guaranteed_indexes_always_spawn_and_never_double() {
        for seed in 0..200u64 {
            let mut rng = StdRng::seed_from_u64(seed);
            let indexes = choose_spawn_indexes(&mut rng, &WINDOW);
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
        for seed in 0..200u64 {
            let mut rng = StdRng::seed_from_u64(seed);
            let indexes = choose_spawn_indexes(&mut rng, &WINDOW);
            let drawn: Vec<u32> =
                indexes.iter().copied().filter(|&i| i > 1).collect();
            // Half-open count range [1, 3): one or two eligible draws.
            assert!((1..=2).contains(&drawn.len()), "seed {seed}: {drawn:?}");
            assert!(
                drawn.iter().all(|i| WINDOW.eligible_indexes.contains(i)),
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

    #[test]
    fn spots_prefer_containers_and_rewarding_rooms() {
        let result = MapGenerationResult {
            rooms: vec![
                room(1, RoomRole::Entrance),
                room(2, RoomRole::Main),
                room(3, RoomRole::Ending),
                room(4, RoomRole::Side),
            ],
            checkpoint_room_entity_ids: vec![1],
            containers: vec![GeneratedContainer {
                entity_id: 9,
                room_role: RoomRole::Side,
            }],
        };
        assert_eq!(spawn_spots(&result), vec![9, 3, 4]);
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
