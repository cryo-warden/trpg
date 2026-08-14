import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { bossPack } from "./testAssets";

// Phase 20: quest room claims. The map gives its Ending room to the
// conquest quest: the warden encounter spawns there, a quests_rooms_roles
// link records the claim, and a second checkpoint object lands in the
// room before the boss — every instance offers a save at the boss's door.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;
let myRoomIds: Set<bigint>;
let entranceRoomId: bigint;
let bossRoomId: bigint;

const roomOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: bossPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM quests",
      "SELECT * FROM quests_rooms_roles",
      "SELECT * FROM location_components",
      "SELECT * FROM location_map_components",
      "SELECT * FROM path_components",
      "SELECT * FROM enemy_controller_components",
      "SELECT * FROM checkpoint_binding_components",
      "SELECT * FROM checkpoint_object_components",
      "SELECT * FROM map_checkpoints_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "challenger" });
  playerEntityId = await playerEntityIdFor(player, "challenger");
  await waitFor(() => roomOf(playerEntityId) != null, 30000);
  entranceRoomId = roomOf(playerEntityId)!;

  const myInstanceId = [...player.db.location_map_components.iter()].find(
    (row) => row.entityId === entranceRoomId,
  )!.locationMapEntityId;
  myRoomIds = new Set(
    [...player.db.location_map_components.iter()]
      .filter((row) => row.locationMapEntityId === myInstanceId)
      .map((row) => row.entityId),
  );

  await waitFor(
    () =>
      [...player.db.quests_rooms_roles.iter()].some((row) =>
        myRoomIds.has(row.roomEntityId),
      ),
    30000,
  );
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("the conquest quest links exactly one room of my instance as its boss room", () => {
  const links = [...player.db.quests_rooms_roles.iter()].filter((row) =>
    myRoomIds.has(row.roomEntityId),
  );
  expect(links.length).toBe(1);
  const link = links[0]!;
  expect(link.role.tag).toBe("Boss");
  const quest = [...player.db.quests.iter()].find(
    (row) => row.id === link.questId,
  )!;
  expect(quest.name).toBe("test_conquest");
  bossRoomId = link.roomEntityId;
  // The claim takes the FAR end, never the room the player wakes in.
  expect(bossRoomId).not.toBe(entranceRoomId);
});

test("the warden waits in the claimed room — and nowhere else", () => {
  const wardensByRoom = [...player.db.enemy_controller_components.iter()]
    .map((row) => roomOf(row.entityId))
    .filter((room) => room != null && myRoomIds.has(room));
  expect(wardensByRoom).toEqual([bossRoomId]);
});

test("a checkpoint stands at the boss's door, registered on the instance", () => {
  // Two checkpoint objects in my instance: the entrance's themed one and
  // the claim's pre-boss one.
  const checkpointRooms = [...player.db.checkpoint_binding_components.iter()]
    .map((row) => roomOf(row.entityId))
    .filter((room) => room != null && myRoomIds.has(room));
  expect(checkpointRooms.length).toBe(2);
  expect(checkpointRooms).toContain(entranceRoomId);
  const preBossRoomId = checkpointRooms.find(
    (room) => room !== entranceRoomId,
  )!;
  expect(preBossRoomId).not.toBe(bossRoomId);
  // The save room is ADJACENT to the boss room: a path leads straight in.
  const leadsToBoss = [...player.db.path_components.iter()].some(
    (path) =>
      roomOf(path.entityId) === preBossRoomId &&
      path.destinationEntityId === bossRoomId,
  );
  expect(leadsToBoss).toBe(true);
  // And the instance records it, so respawn resolution can find the room.
  const instanceId = [...player.db.location_map_components.iter()].find(
    (row) => row.entityId === entranceRoomId,
  )!.locationMapEntityId;
  const registered = [...player.db.map_checkpoints_components.iter()].find(
    (row) => row.entityId === instanceId,
  )!;
  expect(registered.checkpointRoomEntityIds).toContain(preBossRoomId);
});
