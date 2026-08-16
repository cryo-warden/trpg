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
      "SELECT * FROM hp_components",
      "SELECT * FROM hp_share_components",
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

test("a cross-map crossing is a matched HP-linked pair, built both ways at once", async () => {
  // The crossing is ONE physical thing: the near->far path and its far->near
  // twin are created together and share HP (a cave-in collapses both), exactly
  // like an intra-map pair.
  const outbound = pathsIn(anchorRoomId).find(
    (path) => mapOfRoom(path.destinationEntityId) !== nearInstanceId,
  )!;
  const farRoomId = outbound.destinationEntityId;

  // The return twin already exists (materialized together), before arriving.
  const inbound = pathsIn(farRoomId).find(
    (path) => path.destinationEntityId === anchorRoomId,
  );
  expect(inbound).toBeDefined();

  // Mutually HP-share-linked, and each is a real body with HP.
  const partnerOf = (id: bigint) =>
    [...player.db.hp_share_components.iter()].find((r) => r.entityId === id)
      ?.partnerEntityId;
  const hasHp = (id: bigint) =>
    [...player.db.hp_components.iter()].some((r) => r.entityId === id);
  expect(partnerOf(outbound.entityId)).toBe(inbound!.entityId);
  expect(partnerOf(inbound!.entityId)).toBe(outbound.entityId);
  // HP is derived from the path baseline a tick after creation.
  await waitFor(
    () => hasHp(outbound.entityId) && hasHp(inbound!.entityId),
    30000,
  );
  expect(hasHp(outbound.entityId)).toBe(true);
  expect(hasHp(inbound!.entityId)).toBe(true);
});

// NOTE: with party-keyed instances the crossing leads to the player's OWN far
// instance, and its return twin back to the player's OWN near instance. These
// tests stay instance-relative (the e2e admin owns separate instances).
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
  // RE-ENTRY REUSES: traveling back into an already-generated map lands
  // in an existing instance — the round trip generates nothing new.
  const instancesBefore = player.db.map_instance_components.count();
  await moveThrough(returnPath.entityId);
  expect(player.db.map_instance_components.count()).toBe(instancesBefore);
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
