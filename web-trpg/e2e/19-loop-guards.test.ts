import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { guardedMapPack } from "./testAssets";

// Phase 19: loop_count IS the number of guarded backward paths. The
// 3-room chain's one loop (rooms 0<->2) generates blocked in BOTH
// directions by a single boulder standing in the FAR room — so the
// entrance shows fewer paths at first, and the shortcut can only be
// broken open from the far side, revealing the way back.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;
let myRoomIds: Set<bigint>;

const roomOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

const actionIdByName = (name: string): number =>
  [...player.db.actions.iter()].find((row) => row.name === name)!.id;

const myBlockedPaths = () =>
  [...player.db.path_blocker_components.iter()].filter((row) => {
    const room = roomOf(row.entityId);
    return room != null && myRoomIds.has(room);
  });

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

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({
    assetPack: guardedMapPack({ hiddenRoomCount: 0, loopCount: 1 }),
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
  await player.reducers.createAccount({ name: "looper" });
  playerEntityId = await playerEntityIdFor(player, "looper");
  await waitFor(() => roomOf(playerEntityId) != null, 30000);

  const myInstanceId = [...player.db.location_map_components.iter()].find(
    (row) => row.entityId === roomOf(playerEntityId),
  )!.locationMapEntityId;
  myRoomIds = new Set(
    [...player.db.location_map_components.iter()]
      .filter((row) => row.locationMapEntityId === myInstanceId)
      .map((row) => row.entityId),
  );
  await waitFor(() => myBlockedPaths().length === 2, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("the backward loop opens only from the far side", async () => {
  const entranceRoomId = roomOf(playerEntityId)!;

  // Both loop directions share ONE boulder, and it stands in the far
  // room — not beside the entrance, where one of the guarded paths sits.
  const blocked = myBlockedPaths();
  const wallEntityId = blocked[0].blockerEntityId;
  expect(blocked[1].blockerEntityId).toBe(wallEntityId);
  const farRoomId = roomOf(wallEntityId)!;
  expect(farRoomId).not.toBe(entranceRoomId);
  expect(
    blocked.some((row) => roomOf(row.entityId) === entranceRoomId),
  ).toBe(true);

  // Fewer paths at the start of the zone: the entrance offers only the
  // forward path while the loop is guarded.
  expect(openPathsIn(entranceRoomId).length).toBe(1);

  // The long way around: entrance -> middle -> far.
  await moveThrough(openPathsIn(entranceRoomId)[0].entityId);
  const middleRoomId = roomOf(playerEntityId)!;
  await moveThrough(
    openPathsIn(middleRoomId).find(
      (path) => path.destinationEntityId === farRoomId,
    )!.entityId,
  );
  expect(roomOf(playerEntityId)).toBe(farRoomId);

  // Smash the guard from the far side; the shortcut home opens.
  await player.reducers.act({
    actionId: actionIdByName("test_smash"),
    targetEntityId: wallEntityId,
  });
  await waitFor(
    () =>
      ![...player.db.hp_components.iter()].some(
        (row) => row.entityId === wallEntityId,
      ),
    30000,
  );
  await moveThrough(
    openPathsIn(farRoomId).find(
      (path) => path.destinationEntityId === entranceRoomId,
    )!.entityId,
  );
  expect(roomOf(playerEntityId)).toBe(entranceRoomId);
}, 60000);
