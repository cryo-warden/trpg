import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { questPack } from "./testAssets";

// Phase 14: cookie quests end to end. Eating a fresh quest item sets its
// bit (per-viewer, permanent), the quest stat cache scales with the
// popcount, mhp rises through the RATCHET (hp carried up with it), and a
// duplicate index refuses — the bit is the supply, not the physical item.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const idByName = (
  table: { iter: () => Iterable<{ id: number; name: string }> },
  name: string,
): number => [...table.iter()].find((row) => row.name === name)!.id;

const cookieItems = () =>
  [...player.db.item_components.iter()].flatMap((row) =>
    row.itemRef.tag === "QuestItem"
      ? [{ entityId: row.entityId, index: row.itemRef.value.index }]
      : [],
  );

const myHp = () =>
  [...player.db.hp_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

const myBits = () =>
  [...player.db.entities_quests_progress.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

const popcount = (): number => {
  const bytes = myBits()?.bits.bytes ?? new Uint8Array();
  let total = 0;
  for (const byte of bytes) {
    total += byte.toString(2).split("1").length - 1;
  }
  return total;
};

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: questPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM actions_components",
      "SELECT * FROM item_components",
      "SELECT * FROM location_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM entities_quests_progress",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "snacker" });

  playerEntityId = await playerEntityIdFor(player, "snacker");
  await waitFor(() => cookieItems().length === 3, 30000);
  await waitFor(() => myHp() != null, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("eating a fresh cookie sets its bit; mhp AND hp rise through the ratchet", async () => {
  const takeId = idByName(player.db.actions, "test_take");
  const eatId = idByName(player.db.actions, "test_eat");
  const first = cookieItems().find((cookie) => cookie.index === 0)!;

  await player.reducers.act({ actionId: takeId, targetEntityId: first.entityId });
  await waitFor(
    () =>
      [...player.db.location_components.iter()].find(
        (row) => row.entityId === first.entityId,
      )?.locationEntityId === playerEntityId,
    30000,
  );

  await player.reducers.act({ actionId: eatId, targetEntityId: first.entityId });
  await waitFor(() => myHp()?.mhp === 6, 30000);
  // The ratchet: gaining a pool never fakes a damaged state.
  expect(myHp()?.hp).toBe(6);
  expect(popcount()).toBe(1);
  // The eaten cookie is GONE.
  await waitFor(() => cookieItems().length === 2, 30000);
});

test("a duplicate index refuses; a fresh index still works — bits are the supply", async () => {
  const takeId = idByName(player.db.actions, "test_take");
  const eatId = idByName(player.db.actions, "test_eat");

  // The duplicate of the eaten index: take it, try to eat it.
  const duplicate = cookieItems().find((cookie) => cookie.index === 0)!;
  await player.reducers.act({
    actionId: takeId,
    targetEntityId: duplicate.entityId,
  });
  await waitFor(
    () =>
      [...player.db.location_components.iter()].find(
        (row) => row.entityId === duplicate.entityId,
      )?.locationEntityId === playerEntityId,
    30000,
  );
  await player.reducers.act({
    actionId: eatId,
    targetEntityId: duplicate.entityId,
  });

  // Eat the FRESH second index; when its effects land, the duplicate must
  // still exist untouched — its refusal changed nothing.
  const fresh = cookieItems().find((cookie) => cookie.index === 1)!;
  await player.reducers.act({ actionId: takeId, targetEntityId: fresh.entityId });
  await waitFor(
    () =>
      [...player.db.location_components.iter()].find(
        (row) => row.entityId === fresh.entityId,
      )?.locationEntityId === playerEntityId,
    30000,
  );
  await player.reducers.act({ actionId: eatId, targetEntityId: fresh.entityId });

  await waitFor(() => myHp()?.mhp === 7, 30000);
  expect(popcount()).toBe(2);
  const remaining = cookieItems();
  expect(remaining.length).toBe(1);
  expect(remaining[0].index).toBe(0);
  expect(remaining[0].entityId).toBe(duplicate.entityId);
}, 60000);
