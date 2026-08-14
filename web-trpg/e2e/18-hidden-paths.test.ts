import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { guardedMapPack } from "./testAssets";

// Phase 18: hidden rooms. One side room's inbound path is guarded by a
// breakable boulder standing in its attachment room: the path refuses
// passage while the boulder stands, and smashing it opens the way in.
// (The way OUT of a hidden room is never blocked.)

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;
let myRoomIds: Set<bigint>;
let blockedPathId: bigint;
let hiddenRoomId: bigint;
let wallEntityId: bigint;

const roomOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

const wallHasHp = () =>
  [...player.db.hp_components.iter()].some(
    (row) => row.entityId === wallEntityId,
  );

const actionIdByName = (name: string): number =>
  [...player.db.actions.iter()].find((row) => row.name === name)!.id;

/** Open paths standing in the given room (blocked ones excluded). */
const openPathsIn = (roomId: bigint) =>
  [...player.db.path_components.iter()].filter((path) => {
    if (roomOf(path.entityId) !== roomId) {
      return false;
    }
    const blocker = [...player.db.path_blocker_components.iter()].find(
      (row) => row.entityId === path.entityId,
    );
    return (
      blocker == null ||
      ![...player.db.hp_components.iter()].some(
        (row) => row.entityId === blocker.blockerEntityId,
      )
    );
  });

const moveThrough = async (pathEntityId: bigint) => {
  const before = roomOf(playerEntityId);
  await player.reducers.act({
    actionId: actionIdByName("test_move"),
    targetEntityId: pathEntityId,
  });
  await waitFor(() => roomOf(playerEntityId) !== before, 30000);
};

/** Walk the open-path graph to the target room (BFS, then follow). */
const walkTo = async (targetRoomId: bigint) => {
  while (roomOf(playerEntityId) !== targetRoomId) {
    const start = roomOf(playerEntityId)!;
    const parents = new Map<bigint, bigint>([[start, start]]);
    const frontier = [start];
    while (frontier.length > 0 && !parents.has(targetRoomId)) {
      const room = frontier.shift()!;
      for (const path of openPathsIn(room)) {
        if (!parents.has(path.destinationEntityId)) {
          parents.set(path.destinationEntityId, room);
          frontier.push(path.destinationEntityId);
        }
      }
    }
    // First hop along the found route.
    let hop = targetRoomId;
    while (parents.get(hop) !== start) {
      hop = parents.get(hop)!;
    }
    await moveThrough(
      openPathsIn(start).find((path) => path.destinationEntityId === hop)!
        .entityId,
    );
  }
};

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({
    assetPack: guardedMapPack({ hiddenRoomCount: 1, loopCount: 0 }),
  });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM location_components",
      "SELECT * FROM location_map_components",
      "SELECT * FROM path_components",
      "SELECT * FROM path_blocker_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "spelunker" });
  playerEntityId = await playerEntityIdFor(player, "spelunker");
  await waitFor(() => roomOf(playerEntityId) != null, 30000);

  const myInstanceId = [...player.db.location_map_components.iter()].find(
    (row) => row.entityId === roomOf(playerEntityId),
  )!.locationMapEntityId;
  myRoomIds = new Set(
    [...player.db.location_map_components.iter()]
      .filter((row) => row.locationMapEntityId === myInstanceId)
      .map((row) => row.entityId),
  );

  // My instance's single guarded path: inbound to the hidden room.
  await waitFor(
    () =>
      [...player.db.path_blocker_components.iter()].some((row) => {
        const room = roomOf(row.entityId);
        return room != null && myRoomIds.has(room);
      }),
    30000,
  );
  const blockerRow = [...player.db.path_blocker_components.iter()].find(
    (row) => {
      const room = roomOf(row.entityId);
      return room != null && myRoomIds.has(room);
    },
  )!;
  blockedPathId = blockerRow.entityId;
  wallEntityId = blockerRow.blockerEntityId;
  hiddenRoomId = [...player.db.path_components.iter()].find(
    (row) => row.entityId === blockedPathId,
  )!.destinationEntityId;
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("the guarded path refuses passage while its boulder stands", async () => {
  expect(wallHasHp()).toBe(true);
  // The boulder stands in the attachment room, beside its guarded path.
  expect(roomOf(wallEntityId)).toBe(roomOf(blockedPathId)!);

  await walkTo(roomOf(blockedPathId)!);
  // Queue-time refusal: a guarded path is not a valid Move target at all.
  await expect(
    player.reducers.act({
      actionId: actionIdByName("test_move"),
      targetEntityId: blockedPathId,
    }),
  ).rejects.toThrow(/Invalid target/);
  expect(roomOf(playerEntityId)).not.toBe(hiddenRoomId);
}, 60000);

test("smashing the boulder opens the way in — and the way out was never blocked", async () => {
  await player.reducers.act({
    actionId: actionIdByName("test_smash"),
    targetEntityId: wallEntityId,
  });
  await waitFor(() => !wallHasHp(), 30000);

  await moveThrough(blockedPathId);
  expect(roomOf(playerEntityId)).toBe(hiddenRoomId);

  // The return path is open (and always was): walk straight back out.
  const returnPath = openPathsIn(hiddenRoomId).find(
    (path) => path.destinationEntityId === roomOf(wallEntityId),
  )!;
  expect(returnPath).toBeDefined();
  await moveThrough(returnPath.entityId);
  expect(roomOf(playerEntityId)).toBe(roomOf(wallEntityId));
}, 60000);
