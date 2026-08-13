import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { deathPack } from "./testAssets";

// Phase 12: death and checkpoints. Attuning to fortune-telling scenery binds
// the checkpoint; dying wakes the player there from the trance, fully
// restored. A dead NPC is deleted outright — dead vermin stop nipping.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

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
      "SELECT * FROM checkpoint_object_components",
      "SELECT * FROM enemy_controller_components",
      "SELECT * FROM player_controller_components",
    ]);
  await player.reducers.createAccount({ name: "phoenix" });

  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  playerEntityId = [...player.db.player_controller_components.iter()][0]
    .entityId;
  await waitFor(() => player.db.checkpoint_object_components.count() > 0, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("attuning to the bone dice binds the checkpoint to their room", async () => {
  const attuneId = idByName(player.db.actions, "test_attune");
  const diceId = [...player.db.checkpoint_object_components.iter()][0]
    .entityId;
  await player.reducers.act({ actionId: attuneId, targetEntityId: diceId });
  await waitFor(
    () =>
      [...player.db.checkpoint_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.checkpointRoomEntityId === 999n,
    30000,
  );
}, 60000);

test("a slain vermin is deleted outright: dead rats stop nipping", async () => {
  const jabId = idByName(player.db.actions, "test_jab");
  const vermin = [...player.db.enemy_controller_components.iter()].find(
    (row) =>
      [...player.db.location_components.iter()].find(
        (l) => l.entityId === row.entityId,
      )?.locationEntityId === 999n,
  )!;
  await player.reducers.act({
    actionId: jabId,
    targetEntityId: vermin.entityId,
  });
  await waitFor(
    () =>
      ![...player.db.hp_components.iter()].some(
        (row) => row.entityId === vermin.entityId,
      ),
    30000,
  );
  expect(
    [...player.db.enemy_controller_components.iter()].some(
      (row) => row.entityId === vermin.entityId,
    ),
  ).toBe(false);
}, 60000);

test("dying wakes the player at the checkpoint, fully restored", async () => {
  const moveId = idByName(player.db.actions, "test_move");
  const pathEntityId = [...player.db.path_components.iter()][0].entityId;
  await player.reducers.act({ actionId: moveId, targetEntityId: pathEntityId });
  await waitFor(() => myLocation() === 1000n, 30000);

  // The brute's crush is lethal; the trance breaks in the checkpoint room.
  await waitFor(() => myLocation() === 999n, 30000);
  expect(myHp()!.hp).toBe(myHp()!.mhp);
}, 60000);
