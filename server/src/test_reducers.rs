//! TEST-ONLY reducers, compiled ONLY under the `testing` feature into a
//! separate test-module entrypoint (never shipped to production). Each reducer
//! is one test SET: it seeds a minimal fixture, runs the specific system(s)
//! under test against the REAL database, asserts, and returns Ok (pass) or Err
//! (fail, with a message). A reducer names exactly the systems it exercises, so
//! it is immune to systems it does not name — adding a new global system can't
//! break it. Testing is fully STATEFUL on purpose: a game engine's behavior IS
//! its DB semantics (transactions, indexes, event tables), so we run the real
//! systems on the real store rather than mocking anything.
//!
//! A TS runner (web-trpg/e2e) publishes the test module, then calls each
//! reducer and maps Ok -> pass, Err -> fail (surfacing the message). One
//! full-tick integration test (the existing e2e over execute_all_systems) stays
//! the single place unnamed cross-system interactions are in scope.

use ecs::WithEcs;
use spacetimedb::{reducer, ReducerContext};

use crate::entity::*;

/// Fail the test set with a formatted message. Returns Err, which aborts the
/// reducer's transaction — so a failed test also rolls back its fixture.
macro_rules! check {
    ($cond:expr, $($msg:tt)*) => {
        if !($cond) {
            return ::core::result::Result::Err(::std::format!($($msg)*));
        }
    };
}

/// party_leader_sanitation_system repoints a leader that isn't a live entity
/// (here: 0) at the member itself — with NOTHING else in the tick running.
#[reducer]
pub fn test_party_leader_sanitation(ctx: &ReducerContext) -> Result<(), String> {
    let ecs = ctx.ecs();
    let member = ecs.new();
    let member_id = member.entity_id();
    member.upsert_new_party(0);

    crate::system::party_leader_sanitation_system(ecs);

    let leader = ecs.find(member_id).party().map(|p| p.party_leader);
    check!(
        leader == Some(member_id),
        "expected party_leader {member_id}, got {leader:?}"
    );
    Ok(())
}

/// A dead NPC (has a controller) becomes a lingering CORPSE — perished, never
/// flagged for destruction.
#[reducer]
pub fn test_death_corpses_an_npc(ctx: &ReducerContext) -> Result<(), String> {
    let ecs = ctx.ecs();
    let npc = ecs.new();
    let id = npc.entity_id();
    npc.upsert_new_hp(0, 10, 0, 0, 0)
        .into_handle()
        .upsert_new_enemy_controller();

    crate::system::death_system(ecs);

    let handle = ecs.find(id);
    check!(handle.perished().is_some(), "dead NPC should be a corpse (perished)");
    check!(
        handle.destroyed().is_none(),
        "dead NPC must not be flagged for destruction"
    );
    Ok(())
}

/// A dead controllerless OBJECT is flagged for destruction, never corpsed.
#[reducer]
pub fn test_death_destroys_an_object(ctx: &ReducerContext) -> Result<(), String> {
    let ecs = ctx.ecs();
    let object = ecs.new();
    let id = object.entity_id();
    object.upsert_new_hp(0, 10, 0, 0, 0);

    crate::system::death_system(ecs);

    let handle = ecs.find(id);
    check!(
        handle.destroyed().is_some(),
        "dead object should be flagged for destruction"
    );
    check!(handle.perished().is_none(), "an object is not a corpse");
    Ok(())
}

/// A fear counts down its duration and lifts on its own — no rally needed.
/// An entity outside any map instance is never turn-paused, so the duration
/// system ticks it.
#[reducer]
pub fn test_status_duration_expires_fear(ctx: &ReducerContext) -> Result<(), String> {
    let ecs = ctx.ecs();
    let entity = ecs.new();
    let id = entity.entity_id();
    // Intensity 5, one turn left: a single tick should end it.
    entity.upsert_new_fear_status(5, 1);

    crate::system::status_duration_system(ecs);

    check!(
        ecs.find(id).fear_status().is_none(),
        "a fear with duration 1 should expire after one turn"
    );
    Ok(())
}

/// Courage fades a point at a time: its single value is both the remaining
/// duration and the +morale bonus, so a tick decrements it without removing
/// it until it reaches zero.
#[reducer]
pub fn test_status_duration_decays_courage(ctx: &ReducerContext) -> Result<(), String> {
    let ecs = ctx.ecs();
    let entity = ecs.new();
    let id = entity.entity_id();
    entity.upsert_new_courage_status(3);

    crate::system::status_duration_system(ecs);

    let courage = ecs.find(id).courage_status().map(|c| c.morale);
    check!(
        courage == Some(2),
        "courage 3 should decay to 2 after one turn, got {courage:?}"
    );
    Ok(())
}

/// destruction_system deletes a destroyed entity outright.
#[reducer]
pub fn test_destruction_deletes_the_entity(ctx: &ReducerContext) -> Result<(), String> {
    use spacetimedb::Table as _;
    let ecs = ctx.ecs();
    let object = ecs.new();
    let id = object.entity_id();
    object.upsert_new_hp(0, 10, 0, 0, 0).into_handle().upsert_new_destroyed();

    crate::system::destruction_system(ecs);

    check!(
        ecs.db.entities().id().find(id).is_none(),
        "destroyed entity should be gone"
    );
    Ok(())
}
