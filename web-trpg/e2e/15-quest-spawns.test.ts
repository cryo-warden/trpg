import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { spawnPack } from "./testAssets";

// Phase 15: quest spawns ride map GENERATION. No cookie is authored at
// push time; activating a player generates the map, and the quest
// application layer injects the map's declared index window into the
// role-tagged result — guaranteed indexes always, eligible draws within
// bounds, everything placed away from the entrance (containers and
// rewarding rooms first).
//
// TWO map instances generate here: claimAdmin bootstraps the "admin"
// account, and activation currently generates one instance per
// locationless player. Same map, same seed — so the two instances make
// identical draws, and every per-instance expectation just doubles.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const cookieItems = () =>
  [...player.db.item_components.iter()].flatMap((row) =>
    row.itemRef.tag === "QuestItem"
      ? [{ entityId: row.entityId, index: row.itemRef.value.index }]
      : [],
  );

const locationOf = (entityId: bigint) =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

/** Every player sits at its own instance's entrance, so the union of
 * player rooms is the union of entrances. */
const entranceRooms = () =>
  new Set(
    [...player.db.player_controller_components.iter()].flatMap((row) => {
      const room = locationOf(row.entityId);
      return room == null ? [] : [room];
    }),
  );

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: spawnPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM item_components",
      "SELECT * FROM location_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM appearance_features",
      "SELECT * FROM appearance_features_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "spawn_scout" });
  playerEntityId = await playerEntityIdFor(player, "spawn_scout");

  // Each instance spawns 3 cookies: guaranteed [0, 1] plus exactly one
  // eligible draw (count range [1, 2) is locked to 1).
  await waitFor(() => cookieItems().length === 6, 30000);
  await waitFor(() => locationOf(playerEntityId) != null, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("generation spawns the declared window: guaranteed always, eligible within bounds", () => {
  const indexes = cookieItems()
    .map((cookie) => cookie.index)
    .sort((a, b) => a - b);
  expect(indexes.slice(0, 4)).toEqual([0, 0, 1, 1]);
  // The eligible draw: within the window, and identical across the two
  // same-seed instances.
  expect([2, 3, 4]).toContain(indexes[4]);
  expect(indexes[5]).toBe(indexes[4]);
});

test("a supply hole fails the push: every bit of a windowed quest needs a map", async () => {
  // bitCount 5 but the sole window reaches only [0, 3]: bit 4 could never
  // be earned anywhere in the world.
  const holed = spawnPack();
  holed.locationMaps[0].value.questSpawns[0].eligibleIndexes = [2, 3];
  await expect(
    admin.reducers.pushAssets({ assetPack: holed }),
  ).rejects.toThrow(/no map can spawn/);
});

test("spawned cookies land away from the entrance, containers included", () => {
  const entrances = entranceRooms();
  expect(entrances.size).toBeGreaterThan(0);
  for (const cookie of cookieItems()) {
    const spot = locationOf(cookie.entityId);
    expect(spot).toBeDefined();
    expect(entrances.has(spot!)).toBe(false);
  }

  // The theme's locked container count: exactly one breakable jar per
  // instance, itself placed off-entrance. (Players have no hp component,
  // so the jars are the only hp rows.)
  const jars = [...player.db.hp_components.iter()];
  expect(jars.length).toBe(2);
  for (const jar of jars) {
    expect(entrances.has(locationOf(jar.entityId)!)).toBe(false);
  }
});
