import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { connectionsPack } from "./testAssets";

// Phase 13: cross-map connections under the ONE demand predicate. Standing
// in the anchor room demands the far map: it generates and the path
// materializes. Arriving on the far side materializes the return path (the
// reverse join row). A map with no player inside NOR any player beside a
// path into it gains a cleanup timer; approaching the path again sheds it.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const myLocation = (): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  )?.locationEntityId;

const roomOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

/** Path entities sitting in the given room. */
const pathsIn = (roomId: bigint) =>
  [...player.db.path_components.iter()].filter(
    (path) => roomOf(path.entityId) === roomId,
  );

const mapOfRoom = (roomId: bigint): bigint | undefined =>
  [...player.db.location_map_components.iter()].find(
    (row) => row.entityId === roomId,
  )?.locationMapEntityId;

const moveThrough = async (pathEntityId: bigint) => {
  const moveId = [...player.db.actions.iter()].find(
    (row) => row.name === "test_move",
  )!.id;
  const before = myLocation();
  await player.reducers.act({
    actionId: moveId,
    targetEntityId: pathEntityId,
  });
  await waitFor(() => myLocation() !== before, 30000);
};

let nearInstanceId: bigint;
let entranceRoomId: bigint;
let anchorRoomId: bigint;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: connectionsPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
      "SELECT * FROM location_map_components",
      "SELECT * FROM map_instance_components",
      "SELECT * FROM map_cleanup_timer_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM entities_visited_locations",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "wayfarer" });

  playerEntityId = await playerEntityIdFor(player, "wayfarer");
  // Activation generates a near-map instance and places the player in its
  // entrance. (The e2e admin's auto-provisioned player gets its own
  // instance too — every count below is relative, never absolute.)
  await waitFor(() => myLocation() != null, 30000);
  entranceRoomId = myLocation()!;
  nearInstanceId = mapOfRoom(entranceRoomId)!;
  const nearRooms = [...player.db.location_map_components.iter()]
    .filter((row) => row.locationMapEntityId === nearInstanceId)
    .map((row) => row.entityId);
  anchorRoomId = nearRooms.find((id) => id !== entranceRoomId)!;
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("standing in the anchor room generates the far map and materializes the path", async () => {
  const instancesBefore = player.db.map_instance_components.count();
  const intraPath = pathsIn(entranceRoomId).find(
    (path) => path.destinationEntityId === anchorRoomId,
  )!;
  await moveThrough(intraPath.entityId);
  expect(myLocation()).toBe(anchorRoomId);

  // Presence records the visit: the join row (visitor, location) appears
  // for every room stood in, and drives the "more interesting" markers.
  await waitFor(
    () =>
      [...player.db.entities_visited_locations.iter()].some(
        (row) =>
          row.visitorEntityId === playerEntityId &&
          row.locationEntityId === anchorRoomId,
      ),
    30000,
  );

  await waitFor(
    () => player.db.map_instance_components.count() > instancesBefore,
    30000,
  );
  await waitFor(
    () =>
      pathsIn(anchorRoomId).some(
        (path) => mapOfRoom(path.destinationEntityId) !== nearInstanceId,
      ),
    30000,
  );
}, 60000);

// NOTE: connection resolution targets "the first instance" of the
// destination map ASSET, and the e2e admin's auto-provisioned player owns
// its OWN near-map instance — so the return path may legitimately lead to
// EITHER near instance. These tests are instance-AGNOSTIC on purpose; the
// recorded instance-ownership design decides which instance SHOULD win.
test("arriving on the far side materializes a return path", async () => {
  const crossPath = pathsIn(anchorRoomId).find(
    (path) => mapOfRoom(path.destinationEntityId) !== nearInstanceId,
  )!;
  await moveThrough(crossPath.entityId);
  const farRoomId = myLocation()!;
  const farInstanceId = mapOfRoom(farRoomId)!;
  expect(farInstanceId).not.toBe(nearInstanceId);

  await waitFor(
    () =>
      pathsIn(farRoomId).some((path) => {
        const destinationMap = mapOfRoom(path.destinationEntityId);
        return destinationMap != null && destinationMap !== farInstanceId;
      }),
    30000,
  );
}, 60000);

test("an abandoned far map gains a cleanup timer; approaching its path sheds it", async () => {
  const farRoomId = myLocation()!;
  const farInstanceId = mapOfRoom(farRoomId)!;
  const returnPath = pathsIn(farRoomId).find((path) => {
    const destinationMap = mapOfRoom(path.destinationEntityId);
    return destinationMap != null && destinationMap !== farInstanceId;
  })!;
  await moveThrough(returnPath.entityId);
  const landingRoomId = myLocation()!;
  const landingInstanceId = mapOfRoom(landingRoomId)!;
  expect(landingInstanceId).not.toBe(farInstanceId);

  // Beside the path into the far map: still demanded, no timer. One room
  // further away (a sibling room of wherever we landed): undemanded.
  const awayRoomId = [...player.db.location_map_components.iter()]
    .filter((row) => row.locationMapEntityId === landingInstanceId)
    .map((row) => row.entityId)
    .find((id) => id !== landingRoomId)!;
  const awayPath = pathsIn(landingRoomId).find(
    (path) => path.destinationEntityId === awayRoomId,
  )!;
  await moveThrough(awayPath.entityId);
  await waitFor(
    () =>
      [...player.db.map_cleanup_timer_components.iter()].some(
        (row) => row.entityId === farInstanceId,
      ),
    30000,
  );

  // Walk back beside the cross-map path: the ONE predicate keeps the far
  // map alive again.
  const backPath = pathsIn(awayRoomId).find(
    (path) => path.destinationEntityId === landingRoomId,
  )!;
  await moveThrough(backPath.entityId);
  await waitFor(
    () =>
      ![...player.db.map_cleanup_timer_components.iter()].some(
        (row) => row.entityId === farInstanceId,
      ),
    30000,
  );
}, 60000);
