import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { deathPack } from "./testAssets";

// Phase 12: death and checkpoints. Attuning to fortune-telling scenery binds
// the checkpoint; dying wakes the player there from the trance, fully
// restored. A dead NPC is deleted outright — dead vermin stop nipping.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;
// Resolved from real seeded entities (rooms are named blobs now), never
// hardcoded fake ids.
let deathRoomId: bigint;
let bruteRoomId: bigint;

const idByName = (
  table: { iter: () => Iterable<{ id: number; name: string }> },
  name: string,
): number => [...table.iter()].find((row) => row.name === name)!.id;

const myHp = () =>
  [...player.db.hp_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

const myLocation = (): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  )?.locationEntityId;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: deathPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM hp_components",
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
      "SELECT * FROM checkpoint_components",
      "SELECT * FROM accounts",
      "SELECT * FROM checkpoint_object_components",
      "SELECT * FROM enemy_controller_components",
      "SELECT * FROM player_controller_components",
    ]);
  await player.reducers.createAccount({ name: "phoenix" });

  playerEntityId = await playerEntityIdFor(player, "phoenix");
  await waitFor(() => player.db.checkpoint_object_components.count() > 0, 30000);
  // The player spawns in the (real) death room; the authored path leads to the
  // brute room.
  await waitFor(() => myLocation() != null, 30000);
  deathRoomId = myLocation()!;
  await waitFor(() => player.db.path_components.count() > 0, 30000);
  bruteRoomId = [...player.db.path_components.iter()][0].destinationEntityId;
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("attuning to the bone dice binds the ABSTRACT checkpoint (map + index)", async () => {
  const attuneId = idByName(player.db.actions, "test_attune");
  const diceId = [...player.db.checkpoint_object_components.iter()][0]
    .entityId;
  await player.reducers.act({ actionId: attuneId, targetEntityId: diceId });
  await waitFor(
    () =>
      [...player.db.checkpoint_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.checkpointIndex === 0,
    30000,
  );
}, 60000);

test("a slain vermin becomes a corpse: de-fanged but never deleted", async () => {
  const jabId = idByName(player.db.actions, "test_jab");
  const vermin = [...player.db.enemy_controller_components.iter()].find(
    (row) =>
      [...player.db.location_components.iter()].find(
        (l) => l.entityId === row.entityId,
      )?.locationEntityId === deathRoomId,
  )!;
  await player.reducers.act({
    actionId: jabId,
    targetEntityId: vermin.entityId,
  });
  // The body remains at zero hp, name intact for the narration...
  await waitFor(
    () =>
      [...player.db.hp_components.iter()].find(
        (row) => row.entityId === vermin.entityId,
      )?.hp === 0,
    30000,
  );
  // ...and the controller remains too, DORMANT: it marks "combatant, not
  // scenery" so the fallen stay put in the threat panel, while
  // enemy_control_system skips the dead (no more nipping).
  expect(
    [...player.db.enemy_controller_components.iter()].some(
      (row) => row.entityId === vermin.entityId,
    ),
  ).toBe(true);
}, 60000);

test("death entrances (no acting), then wakes the player in the freshly generated haven", async () => {
  const moveId = idByName(player.db.actions, "test_move");
  const jabId = idByName(player.db.actions, "test_jab");
  const pathEntityId = [...player.db.path_components.iter()][0].entityId;
  await player.reducers.act({ actionId: moveId, targetEntityId: pathEntityId });
  await waitFor(() => myLocation() === bruteRoomId, 30000);

  // The brute's crush is lethal: hp hits 0 and the trance holds — acting
  // is refused until the wake.
  await waitFor(() => myHp()?.hp === 0, 30000);
  await expect(
    player.reducers.act({ actionId: jabId, targetEntityId: playerEntityId }),
  ).rejects.toThrow(/dead/);

  // The haven map did not exist; waking generates it on demand. The wake
  // room is brand new — neither seeded room.
  await waitFor(
    () => myLocation() !== 1000n && (myHp()?.hp ?? 0) > 0,
    30000,
  );
  expect(myLocation()).not.toBe(deathRoomId);
  expect(myLocation()).not.toBe(bruteRoomId);
  expect(myHp()!.hp).toBe(myHp()!.mhp);
}, 60000);
