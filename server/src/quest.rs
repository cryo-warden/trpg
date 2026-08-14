use ecs::Ecs;
use spacetimedb::{table, Table};

use crate::bitset::Bitset;

/// One entity's progress through one quest: a JOIN row (many quests per
/// entity) holding the ordered bitset — for cookie quests, bit index =
/// cookie index; the computed stat contribution scales with the popcount.
/// Public: the client reads its own bits to decide which quest items
/// still smell fresh.
#[table(accessor = quest_progress, public)]
pub struct QuestProgress {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub entity_id: u64,
    #[index(btree)]
    pub quest_id: u32,
    pub bits: Bitset,
}

/// An entity ceasing to exist takes its quest progress with it. Called
/// wherever entities are actually deleted, like visited-location rows.
pub fn cleanup_quest_rows(ecs: Ecs, entity_id: u64) {
    let row_ids: Vec<u64> = ecs
        .db
        .quest_progress()
        .entity_id()
        .filter(entity_id)
        .map(|row| row.id)
        .collect();
    for row_id in row_ids {
        ecs.db.quest_progress().id().delete(row_id);
    }
}
