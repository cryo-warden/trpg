use ecs::Ecs;
use spacetimedb::{
    rand::{rngs::StdRng, seq::SliceRandom, SeedableRng},
    table, SpacetimeType, Table,
};

use crate::asset::encounter::encounters;
use crate::asset::location_map::{location_maps, LocationMap, MapGenerationResult, RoomRole};
use crate::asset::location_map_theme::location_map_themes;
use crate::asset::rng_range::RngRange;
use crate::asset::weighted_sampler::WeightedSampler;
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

/// The role a quest assigns to a generated room. Distinct from RoomRole —
/// that is generation's SHAPE vocabulary (where the room sits); this is
/// the quest layer's MEANING vocabulary (what the room is for).
#[derive(Debug, Clone, Copy, PartialEq, Eq, SpacetimeType)]
pub enum QuestRoomRole {
    /// Hosts the quest's authored boss encounter. The hook for
    /// defeat-bits, completion-gated doors, and future teleports.
    Boss,
}

/// A quest's claim on a generated room, written by the quest application
/// layer whenever a claim resolves: the room now serves a role the quest
/// declared. Public: the client may render a linked room's significance.
/// (Join naming principle: sides joined — quests x rooms — then the
/// relation's semantics: roles.)
#[table(accessor = quests_rooms_roles, public)]
pub struct QuestsRoomsRole {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub quest_id: u32,
    #[index(btree)]
    pub room_entity_id: u64,
    pub role: QuestRoomRole,
}

/// A room's quest-room link rows die with the room. Hooked into
/// delete_entity_with_joins like every other join table.
pub fn cleanup_quest_room_rows(ecs: Ecs, entity_id: u64) {
    let row_ids: Vec<u64> = ecs
        .db
        .quests_rooms_roles()
        .room_entity_id()
        .filter(entity_id)
        .map(|row| row.id)
        .collect();
    for row_id in row_ids {
        ecs.db.quests_rooms_roles().id().delete(row_id);
    }
}

/// One quest's room claim in one map (a column on LocationMap): every
/// instance of the map gives one room to the quest for the declared role,
/// spawning the claimed encounter there — and, when asked, a themed
/// checkpoint object in the room just before it, so the boss is always
/// approached from a save point.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestRoomClaim {
    pub quest_id: u32,
    pub role: QuestRoomRole,
    /// The encounter populated into the claimed room (the boss).
    pub encounter_id: u32,
    pub spawn_checkpoint_before: bool,
    /// When set, every entity the claimed encounter spawns carries a
    /// DefeatDropComponent: felling the last of them DROPS one of these
    /// items per player present — a visible reward to take and eat, not
    /// a silent stat bump.
    pub defeat_drop: Option<QuestDefeatDrop>,
}

/// What a boss claim drops on defeat: a quest item — same bit logic as
/// the hidden cookies (per-player progress, freshness, eat) — with its
/// OWN quest reference, so one quest's monster may hold another quest's
/// item. The blob lives here on the map row, not on the carrier: an
/// EntityBlob inside a component would make EntityBlob recursive.
#[derive(Debug, Clone, SpacetimeType)]
pub struct QuestDefeatDrop {
    pub quest_id: u32,
    pub index: u32,
    /// The dropped item's presentation; the payout stamps the QuestItem
    /// ref onto a copy, exactly like the spawn windows do.
    pub item_blob: EntityBlob,
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

/// Distinguishes the room-claim layer's rng stream from generation's, the
/// item layer's, and the encounter layer's: all derive from the map's
/// seed, and sharing a stream would correlate the draws.
const QUEST_ROOM_RNG_STREAM: u64 = u64::from_le_bytes(*b"questroo");

/// The rooms a boss claim takes: the Ending room hosts the boss, and the
/// last Main room — its neighbor on the chain — hosts the checkpoint
/// placed before it. Pure selection over the role-tagged result.
struct BossClaimRooms {
    boss_room_entity_id: u64,
    /// None when the chain has no Main room (a two-room map): the
    /// entrance already carries the map's guaranteed checkpoint, so no
    /// second one spawns.
    before_room_entity_id: Option<u64>,
}

fn boss_claim_rooms(result: &MapGenerationResult) -> Option<BossClaimRooms> {
    let boss_room_entity_id = result
        .rooms
        .iter()
        .find(|room| room.role == RoomRole::Ending)
        .map(|room| room.entity_id)?;
    Some(BossClaimRooms {
        boss_room_entity_id,
        before_room_entity_id: result
            .rooms
            .iter()
            .rfind(|room| room.role == RoomRole::Main)
            .map(|room| room.entity_id),
    })
}

/// The FIRST quest application stage, ahead of item spawns: each claim
/// takes the map's Ending room for its declared role, populates the
/// claimed encounter there, records the quests_rooms_roles link, and —
/// when asked — places a themed checkpoint object in the room before it
/// (registered on the instance like generation's entrance checkpoint, so
/// respawn resolution finds it). Both rooms are consumed from the result:
/// no item spawn or wandering encounter lands in the boss's lair or the
/// save room at its door.
pub fn apply_quest_room_claims(
    ecs: Ecs,
    map: &LocationMap,
    result: &mut MapGenerationResult,
) -> Result<(), String> {
    if map.quest_room_claims.is_empty() {
        return Ok(());
    }
    let mut rng =
        StdRng::seed_from_u64(map.rng_seed.unwrap_or_default() ^ QUEST_ROOM_RNG_STREAM);
    for claim in &map.quest_room_claims {
        let Some(rooms) = boss_claim_rooms(result) else {
            log::warn!(
                "Map \"{}\" has no ending room left for quest {}'s boss claim.",
                map.name,
                claim.quest_id
            );
            continue;
        };
        if let Some(encounter) = ecs.db.encounters().id().find(claim.encounter_id) {
            let spawned_entity_ids =
                encounter.populate(&ecs.find(rooms.boss_room_entity_id))?;
            if let Some(drop) = &claim.defeat_drop {
                for spawned_entity_id in spawned_entity_ids {
                    ecs.find(spawned_entity_id)
                        .upsert_new_defeat_drop(drop.quest_id, drop.index);
                }
            }
        }
        ecs.db.quests_rooms_roles().insert(QuestsRoomsRole {
            id: 0,
            quest_id: claim.quest_id,
            room_entity_id: rooms.boss_room_entity_id,
            role: claim.role,
        });
        if claim.spawn_checkpoint_before {
            if let Some(before_room_entity_id) = rooms.before_room_entity_id {
                let checkpoint_blob = ecs
                    .db
                    .location_map_themes()
                    .id()
                    .find(map.theme_id)
                    .and_then(|theme| theme.checkpoints_selector.sample(&mut rng).cloned());
                let instance_entity_id = ecs
                    .find(before_room_entity_id)
                    .location_map()
                    .map(|room_map| room_map.location_map_entity_id);
                if let (Some(checkpoint_blob), Some(instance_entity_id)) =
                    (checkpoint_blob, instance_entity_id)
                {
                    // Register the room on the instance first: the object's
                    // binding index points into this list.
                    let mut checkpoint_room_entity_ids = ecs
                        .find(instance_entity_id)
                        .map_checkpoints()
                        .map(|checkpoints| checkpoints.checkpoint_room_entity_ids)
                        .unwrap_or_default();
                    let checkpoint_index = checkpoint_room_entity_ids.len() as u32;
                    checkpoint_room_entity_ids.push(before_room_entity_id);
                    ecs.find(instance_entity_id)
                        .upsert_new_map_checkpoints(checkpoint_room_entity_ids);
                    ecs.new()
                        .instantiate_blob(checkpoint_blob, &ecs.instantiation_scope())?
                        .upsert_new_location(before_room_entity_id)
                        .into_handle()
                        .upsert_new_checkpoint_binding(map.id, checkpoint_index);
                    result.checkpoint_room_entity_ids.push(before_room_entity_id);
                    consume_spot(result, before_room_entity_id);
                }
            }
        }
        consume_spot(result, rooms.boss_room_entity_id);
    }
    Ok(())
}

/// The payoff of a boss claim, called by the death system on a fallen
/// defeat-drop carrier: when no other LIVING carrier of the same (quest,
/// index) pair remains in the same map instance — the reward falls with
/// the last of the claim's spawn — one sparkling quest item per player
/// present DROPS into the room, to be seen, taken, and eaten (the same
/// per-player bit logic as the hidden cookies; anticipation over a
/// silent stat bump). The carrier's component is consumed here: the
/// one-shot latch, since a dead NPC lingers as a corpse and re-enters
/// the death scan every tick. Instance-scoped on purpose: another
/// player's instance of the same map keeps its own warden, and that one
/// standing must not hold THIS payout.
pub fn drop_defeat_reward(ecs: Ecs, entity_id: u64) {
    let Some(defeat) = ecs.find(entity_id).defeat_drop() else {
        return;
    };
    ecs.find(entity_id).delete_defeat_drop();
    let instance_entity_id = crate::turn::map_instance_id_of(ecs, entity_id);
    let another_carrier_stands = ecs.iter_defeat_drop().any(|other| {
        let other_defeat = other.defeat_drop();
        let other_entity_id = other.entity_id();
        other_entity_id != entity_id
            && other_defeat.quest_id == defeat.quest_id
            && other_defeat.index == defeat.index
            && ecs
                .find(other_entity_id)
                .hp()
                .is_some_and(|hp| hp.hp > 0)
            && crate::turn::map_instance_id_of(ecs, other_entity_id) == instance_entity_id
    });
    if another_carrier_stands {
        return;
    }
    let Some(room_entity_id) = ecs
        .find(entity_id)
        .location()
        .map(|location| location.location_entity_id)
    else {
        return;
    };
    // The drop's blob lives on the map row (see QuestDefeatDrop): resolve
    // instance -> map asset -> the matching claim.
    let item_blob = instance_entity_id
        .and_then(|id| ecs.find(id).map_instance().map(|m| m.location_map_id))
        .and_then(|map_id| ecs.db.location_maps().id().find(map_id))
        .and_then(|map| {
            map.quest_room_claims.into_iter().find_map(|claim| {
                claim.defeat_drop.filter(|drop| {
                    drop.quest_id == defeat.quest_id && drop.index == defeat.index
                })
            })
        })
        .map(|drop| drop.item_blob);
    let Some(item_blob) = item_blob else {
        log::error!(
            "Defeat-drop carrier {} fell but no claim on its map declares the (quest {}, bit {}) drop.",
            entity_id,
            defeat.quest_id,
            defeat.index
        );
        return;
    };
    // One per player present — party-friendly — and never fewer than one:
    // an empty room must not erase the instance's reward supply.
    let player_count = ecs
        .db
        .location_components()
        .location_entity_id()
        .filter(room_entity_id)
        .filter(|row| ecs.find(row.entity_id).player_controller().is_some())
        .count();
    for _ in 0..player_count.max(1) {
        let mut blob = item_blob.clone();
        blob.item = Some(ItemComponentBlob {
            item_ref: ItemRef::QuestItem(QuestItemRef {
                quest_id: defeat.quest_id,
                index: defeat.index,
            }),
        });
        match ecs.new().instantiate_blob(blob, &ecs.instantiation_scope()) {
            Ok(item) => {
                item.insert_new_location(room_entity_id);
            }
            Err(error) => {
                log::error!("Defeat drop failed to instantiate: {}", error);
            }
        }
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
    fn a_boss_claim_takes_the_ending_room_and_saves_before_it() {
        let rooms = boss_claim_rooms(&four_room_result()).unwrap();
        assert_eq!(rooms.boss_room_entity_id, 3);
        assert_eq!(rooms.before_room_entity_id, Some(2));
    }

    #[test]
    fn a_two_room_map_claims_the_ending_but_adds_no_checkpoint() {
        let result = MapGenerationResult {
            rooms: vec![room(1, RoomRole::Entrance), room(2, RoomRole::Ending)],
            checkpoint_room_entity_ids: vec![1],
            containers: vec![],
        };
        let rooms = boss_claim_rooms(&result).unwrap();
        assert_eq!(rooms.boss_room_entity_id, 2);
        assert_eq!(rooms.before_room_entity_id, None);
    }

    #[test]
    fn no_ending_room_left_means_no_claim() {
        let mut result = four_room_result();
        consume_spot(&mut result, 3);
        assert!(boss_claim_rooms(&result).is_none());
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
