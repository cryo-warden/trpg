import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { interactionsPack } from "./testAssets";

// Phase 21: offered interactions. Containers offer their own verbs to
// anyone beside them — the player knows NO item verbs at all (take
// derives from the special-action registry), yet opens the chest
// (contents revealed, takeable in place, intact) and dumps the sack
// (contents spill to the floor, container unharmed). An interaction a
// container does NOT offer is refused at queue time — and so is an
// offer whose actor-side requirements the player cannot meet.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;
let chestEntityId: bigint;
let sackEntityId: bigint;
let chestCookieId: bigint;
let sackCookieId: bigint;

const actionIdByName = (name: string): number =>
  [...player.db.actions.iter()].find((row) => row.name === name)!.id;

const locationOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

const hpOf = (entityId: bigint): number | undefined =>
  [...player.db.hp_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.hp;

const isOpen = (entityId: bigint): boolean =>
  [...player.db.open_components.iter()].some(
    (row) => row.entityId === entityId,
  );

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: interactionsPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM location_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM item_components",
      "SELECT * FROM open_components",
      "SELECT * FROM offered_actions_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM readiness_total_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "looter" });
  playerEntityId = await playerEntityIdFor(player, "looter");

  // The containers identify themselves by what they OFFER.
  await waitFor(
    () => [...player.db.offered_actions_components.iter()].length === 2,
    30000,
  );
  const openId = actionIdByName("test_open");
  const offers = [...player.db.offered_actions_components.iter()];
  chestEntityId = offers.find((row) => row.actionIds.includes(openId))!
    .entityId;
  sackEntityId = offers.find((row) => !row.actionIds.includes(openId))!
    .entityId;
  chestCookieId = [...player.db.item_components.iter()].find(
    (row) => locationOf(row.entityId) === chestEntityId,
  )!.entityId;
  sackCookieId = [...player.db.item_components.iter()].find(
    (row) => locationOf(row.entityId) === sackEntityId,
  )!.entityId;
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("an interaction the container does not offer is refused at queue time", async () => {
  await expect(
    player.reducers.act({
      actionId: actionIdByName("test_open"),
      targetEntityId: sackEntityId,
    }),
  ).rejects.toThrow(/Invalid target/);
  await expect(
    player.reducers.act({
      actionId: actionIdByName("test_dump"),
      targetEntityId: chestEntityId,
    }),
  ).rejects.toThrow(/Invalid target/);
});

test("a closed container keeps take out of reach", async () => {
  await expect(
    player.reducers.act({
      actionId: actionIdByName("test_take"),
      targetEntityId: chestCookieId,
    }),
  ).rejects.toThrow(/Invalid target/);
});

test("an offer beyond the actor's strength is refused: requirements gate acts too", async () => {
  // The gate reads the DERIVED total, so wait for the stats pipeline
  // first (before it derives, requirements deliberately go unchecked).
  await waitFor(
    () =>
      [...player.db.readiness_total_components.iter()].some(
        (row) => row.entityId === playerEntityId,
      ),
    30000,
  );
  // The chest OFFERS test_heave, but heaving it needs committed nerve
  // (morale 3) beyond a timid looter (morale 0): offered does not mean able.
  await expect(
    player.reducers.act({
      actionId: actionIdByName("test_heave"),
      targetEntityId: chestEntityId,
    }),
  ).rejects.toThrow(/Invalid target/);
});

test("opening the chest reveals its contents in place — then take reaches inside", async () => {
  // The player never KNOWS test_open; the chest offers it.
  await player.reducers.act({
    actionId: actionIdByName("test_open"),
    targetEntityId: chestEntityId,
  });
  await waitFor(() => isOpen(chestEntityId), 30000);

  // Revealed, not spilled: the cookie stays inside, the chest unharmed.
  expect(locationOf(chestCookieId)).toBe(chestEntityId);
  expect(hpOf(chestEntityId)).toBe(2);

  await player.reducers.act({
    actionId: actionIdByName("test_take"),
    targetEntityId: chestCookieId,
  });
  await waitFor(() => locationOf(chestCookieId) === playerEntityId, 30000);
});

test("dumping the sack spills its contents to the floor, container unharmed", async () => {
  const room = locationOf(playerEntityId)!;
  await player.reducers.act({
    actionId: actionIdByName("test_dump"),
    targetEntityId: sackEntityId,
  });
  await waitFor(() => locationOf(sackCookieId) === room, 30000);

  // Spilled, not opened and not broken.
  expect(isOpen(sackEntityId)).toBe(false);
  expect(hpOf(sackEntityId)).toBe(2);
});
