import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { arenaPack } from "./testAssets";

// Phase 17: Common zones run in REALTIME. The same arena as phase 16 but
// zoneKind Common: the lurker's strike proceeds while the player stands
// there with no assigned action — no turn guard.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const roomOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

const hpOf = (entityId: bigint) =>
  [...player.db.hp_components.iter()].find(
    (row) => row.entityId === entityId,
  );

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: arenaPack("Common") });

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
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "townwalker" });
  playerEntityId = await playerEntityIdFor(player, "townwalker");
  await waitFor(() => roomOf(playerEntityId) != null, 30000);
  await waitFor(() => hpOf(playerEntityId) != null, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("a common zone stays realtime: the lurker strikes an actionless player", async () => {
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
  const enemyRoomId = roomOf(
    [...player.db.enemy_controller_components.iter()].find((row) => {
      const room = roomOf(row.entityId);
      return room != null && myRoomIds.has(room);
    })!.entityId,
  )!;

  // Walk in, then DO NOTHING: realtime means the strike lands anyway.
  const pathToEnemy = [...player.db.path_components.iter()].find(
    (row) =>
      roomOf(row.entityId) === entranceRoomId &&
      row.destinationEntityId === enemyRoomId,
  )!;
  const moveId = [...player.db.actions.iter()].find(
    (row) => row.name === "test_move",
  )!.id;
  await player.reducers.act({
    actionId: moveId,
    targetEntityId: pathToEnemy.entityId,
  });
  await waitFor(() => roomOf(playerEntityId) === enemyRoomId, 30000);

  await waitFor(() => hpOf(playerEntityId)!.hp < 20, 30000);
  expect(roomOf(playerEntityId)).toBe(enemyRoomId);
}, 60000);
