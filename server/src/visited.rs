use ecs::Ecs;
use spacetimedb::{table, Table};

/// A JOIN of visitor to location: which rooms each player-controlled entity
/// has ever stood in. Both columns are indexed — the client asks "has MY
/// entity visited THIS path's destination", and cleanup walks both sides
/// when either entity ceases to exist.
#[table(accessor = visited_locations, public)]
pub struct VisitedLocation {
    #[primary_key]
    #[auto_inc]
    pub id: u64,
    #[index(btree)]
    pub visitor_entity_id: u64,
    #[index(btree)]
    pub location_entity_id: u64,
}

pub fn record_visit(ecs: Ecs, visitor_entity_id: u64, location_entity_id: u64) {
    let already = ecs
        .db
        .visited_locations()
        .visitor_entity_id()
        .filter(visitor_entity_id)
        .any(|row| row.location_entity_id == location_entity_id);
    if !already {
        ecs.db.visited_locations().insert(VisitedLocation {
            id: 0,
            visitor_entity_id,
            location_entity_id,
        });
    }
}

/// An entity ceasing to exist takes its visit rows with it — as visitor
/// AND as location. Called wherever entities are actually deleted.
pub fn cleanup_visited_rows(ecs: Ecs, entity_id: u64) {
    let row_ids: Vec<u64> = ecs
        .db
        .visited_locations()
        .visitor_entity_id()
        .filter(entity_id)
        .map(|row| row.id)
        .chain(
            ecs.db
                .visited_locations()
                .location_entity_id()
                .filter(entity_id)
                .map(|row| row.id),
        )
        .collect();
    for row_id in row_ids {
        ecs.db.visited_locations().id().delete(row_id);
    }
}
