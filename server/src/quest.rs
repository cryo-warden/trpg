use ecs::Ecs;
use spacetimedb::{table, Table};

use crate::bitset::Bitset;
use crate::entity::{quest_stat_block_dirty_flag_components, FlagComponent};

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
#[allow(dead_code)] // First caller is the Eat effect, next slice.
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
