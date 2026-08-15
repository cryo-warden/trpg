//! Turn-based location maps. A Private map instance is TURN-GUARDED:
//! actions do not proceed for ANY entity in it while some player there is
//! missing an assigned action — the world waits for everyone to choose.
//! Two carve-outs keep this from ever holding a table hostage:
//!
//! - IDLE players (actionless for 30+ seconds, stamped by
//!   actionless_stamp_system) are ignored by the guard whenever the
//!   instance has at least one non-idle player. When EVERY player there
//!   is idle, the instance simply pauses.
//! - Common zones (towns) run in realtime; the guard never applies.
//!
//! Entities outside any map instance are untouched — realtime.

use std::collections::{HashMap, HashSet};

use crate::asset::location_map::{location_maps, ZoneKind};
use crate::entity::*;
use ecs::Ecs;
use spacetimedb::TimeDuration;

/// How long a player must sit actionless before the turn guard stops
/// waiting for them (given company that is not).
pub const ACTIONLESS_IDLE_MICROS: i64 = 30_000_000;

/// One player as the guard sees them. Idleness implies actionless — a
/// player with an assigned action is never idle.
pub struct TurnParticipant {
    pub has_assigned_action: bool,
    pub is_idle: bool,
}

/// The pure guard: does this set of players hold their instance's turn?
pub fn turn_is_blocked(participants: &[TurnParticipant]) -> bool {
    if participants.is_empty() {
        return false;
    }
    if participants.iter().all(|participant| participant.is_idle) {
        return true;
    }
    participants
        .iter()
        .any(|participant| !participant.is_idle && !participant.has_assigned_action)
}

/// The map instance an entity currently stands in, if any: its location
/// must be a generated room, which records its instance.
pub fn map_instance_id_of(ecs: Ecs, entity_id: u64) -> Option<u64> {
    let room_entity_id = ecs.find(entity_id).location()?.location_entity_id;
    Some(
        ecs.find(room_entity_id)
            .location_map()?
            .location_map_entity_id,
    )
}

/// Reads the derived flag: is this entity's instance waiting on a turn?
/// Entities outside any instance are never paused.
pub fn instance_is_paused(ecs: Ecs, entity_id: u64) -> bool {
    map_instance_id_of(ecs, entity_id)
        .is_some_and(|instance_id| ecs.find(instance_id).turn_paused().is_some())
}

/// THE derivation point, once per tick: syncs each map instance's public
/// turn_paused flag to the guard's verdict. The action systems consult
/// the flag, and the client renders its waiting overlay from the same
/// row.
pub fn turn_pause_system(ecs: Ecs) {
    let blocked = blocked_map_instance_ids(ecs);
    for instance in ecs.iter_map_instance() {
        let handle = instance.into_handle();
        let paused = blocked.contains(&handle.entity_id());
        let flagged = handle.turn_paused().is_some();
        if paused && !flagged {
            handle.upsert_new_turn_paused();
        } else if !paused && flagged {
            handle.delete_turn_paused();
        }
    }
}

/// Every map instance whose turn has not come — the raw verdict
/// turn_pause_system persists onto the instance rows.
fn blocked_map_instance_ids(ecs: Ecs) -> HashSet<u64> {
    let mut participants_by_instance: HashMap<u64, Vec<TurnParticipant>> = HashMap::new();
    for p in ecs.iter_player_controller() {
        let handle = p.into_handle();
        let Some(instance_id) = map_instance_id_of(ecs, handle.entity_id()) else {
            continue;
        };
        let has_assigned_action = handle.action_state().is_some()
            || { handle.action_queue() }.is_some_and(|q| !q.entries.is_empty());
        let is_idle = !has_assigned_action
            && handle.actionless_since().is_some_and(|since| {
                since.timestamp + TimeDuration::from_micros(ACTIONLESS_IDLE_MICROS)
                    <= ecs.timestamp
            });
        participants_by_instance
            .entry(instance_id)
            .or_default()
            .push(TurnParticipant {
                has_assigned_action,
                is_idle,
            });
    }
    participants_by_instance
        .into_iter()
        .filter(|(instance_id, participants)| {
            let zone_kind = ecs
                .find(*instance_id)
                .map_instance()
                .and_then(|instance| {
                    ecs.db.location_maps().id().find(instance.location_map_id)
                })
                .map(|map| map.zone_kind);
            if zone_kind == Some(ZoneKind::Common) {
                return false;
            }
            turn_is_blocked(participants)
        })
        .map(|(instance_id, _)| instance_id)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn participant(has_assigned_action: bool, is_idle: bool) -> TurnParticipant {
        TurnParticipant {
            has_assigned_action,
            is_idle,
        }
    }

    #[test]
    fn no_players_means_realtime() {
        assert!(!turn_is_blocked(&[]));
    }

    #[test]
    fn an_actionless_player_holds_the_turn() {
        assert!(turn_is_blocked(&[participant(false, false)]));
        assert!(turn_is_blocked(&[
            participant(true, false),
            participant(false, false),
        ]));
    }

    #[test]
    fn everyone_assigned_lets_the_turn_proceed() {
        assert!(!turn_is_blocked(&[
            participant(true, false),
            participant(true, false),
        ]));
    }

    #[test]
    fn idle_players_are_ignored_while_anyone_is_not() {
        // The idle player's missing action no longer holds the others.
        assert!(!turn_is_blocked(&[
            participant(true, false),
            participant(false, true),
        ]));
        // But a non-idle actionless player still does.
        assert!(turn_is_blocked(&[
            participant(false, false),
            participant(false, true),
        ]));
    }

    #[test]
    fn an_all_idle_instance_pauses() {
        assert!(turn_is_blocked(&[participant(false, true)]));
        assert!(turn_is_blocked(&[
            participant(false, true),
            participant(false, true),
        ]));
    }
}
