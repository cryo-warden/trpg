import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { arenaPack } from "./testAssets";

// Phase 16: Private map instances are TURN-BASED. While the only player
// in an instance has no assigned action, NOTHING there advances — the
// lurker's queued strike stays queued indefinitely. The moment the player
// assigns an action, the turn fires and both actions resolve.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;
let enemyEntityId: bigint;
let enemyRoomId: bigint;

const roomOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

const hpOf = (entityId: bigint) =>
  [...player.db.hp_components.iter()].find(
    (row) => row.entityId === entityId,
  );

const actionIdByName = (name: string): number =>
  [...player.db.actions.iter()].find((row) => row.name === name)!.id;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: arenaPack("Private") });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM location_components",
      "SELECT * FROM location_map_components",
      "SELECT * FROM path_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM enemy_controller_components",
      "SELECT * FROM action_state_components",
      "SELECT * FROM queued_action_state_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "turnwalker" });
  playerEntityId = await playerEntityIdFor(player, "turnwalker");
  await waitFor(() => roomOf(playerEntityId) != null, 30000);

  // My instance's lurker: the enemy standing in a room of MY map (the
  // admin's auto-provisioned player has its own instance and lurker).
  const entranceRoomId = roomOf(playerEntityId)!;
  const myInstanceId = [...player.db.location_map_components.iter()].find(
    (row) => row.entityId === entranceRoomId,
  )!.locationMapEntityId;
  const myRoomIds = new Set(
    [...player.db.location_map_components.iter()]
      .filter((row) => row.locationMapEntityId === myInstanceId)
      .map((row) => row.entityId),
  );
  await waitFor(
    () =>
      [...player.db.enemy_controller_components.iter()].some((row) => {
        const room = roomOf(row.entityId);
        return room != null && myRoomIds.has(room);
      }),
    30000,
  );
  enemyEntityId = [...player.db.enemy_controller_components.iter()].find(
    (row) => {
      const room = roomOf(row.entityId);
      return room != null && myRoomIds.has(room);
    },
  )!.entityId;
  enemyRoomId = roomOf(enemyEntityId)!;
  expect(enemyRoomId).not.toBe(entranceRoomId);

  // Walk into the lurker's room (the move is an assigned action, so the
  // turn advances while it runs).
  const pathToEnemy = [...player.db.path_components.iter()].find(
    (row) =>
      roomOf(row.entityId) === entranceRoomId &&
      row.destinationEntityId === enemyRoomId,
  )!;
  await player.reducers.act({
    actionId: actionIdByName("test_move"),
    targetEntityId: pathToEnemy.entityId,
  });
  await waitFor(() => roomOf(playerEntityId) === enemyRoomId, 30000);
  await waitFor(() => hpOf(playerEntityId) != null, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("the world holds while the player has no assigned action", async () => {
  // The lurker notices the player and queues its strike...
  await waitFor(
    () =>
      [...player.db.queued_action_state_components.iter()].some(
        (row) => row.entityId === enemyEntityId,
      ),
    30000,
  );
  // ...and then NOTHING happens: the queued strike never activates and
  // the player takes no damage, across many ticks.
  await sleep(5000);
  expect(hpOf(playerEntityId)!.hp).toBe(20);
  expect(
    [...player.db.action_state_components.iter()].some(
      (row) => row.entityId === enemyEntityId,
    ),
  ).toBe(false);
}, 60000);

test("assigning an action fires the turn: both strikes resolve", async () => {
  await player.reducers.act({
    actionId: actionIdByName("test_strike"),
    targetEntityId: enemyEntityId,
  });
  await waitFor(() => hpOf(playerEntityId)!.hp < 20, 30000);
  await waitFor(() => hpOf(enemyEntityId)!.hp < 10, 30000);
}, 60000);
