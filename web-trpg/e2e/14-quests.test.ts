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
      "SELECT * FROM appearance_features",
      "SELECT * FROM appearance_features_components",
      "SELECT * FROM entities_quests_progress",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "snacker" });

  playerEntityId = await playerEntityIdFor(player, "snacker");
  await waitFor(() => cookieItems().length === 4, 30000);
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
  // The ratchet: gaining a maximum never fakes a damaged state.
  expect(myHp()?.hp).toBe(6);
  expect(popcount()).toBe(1);
  // The eaten cookie is GONE.
  await waitFor(() => cookieItems().length === 3, 30000);
}, 60000);

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
  expect(remaining.length).toBe(2);
  expect(remaining.every((cookie) => [0, 2].includes(cookie.index))).toBe(true);
}, 60000);

test("smashing the jar spills its cookie and leaves ceramic shards", async () => {
  const takeId = idByName(player.db.actions, "test_take");
  const eatId = idByName(player.db.actions, "test_eat");
  const smashId = idByName(player.db.actions, "test_smash");

  // The jar: the only OTHER hp-bearing entity. Its cookie (index 2) is
  // inside it, not in the room.
  const jarId = [...player.db.hp_components.iter()].find(
    (row) => row.entityId !== playerEntityId,
  )!.entityId;
  const hidden = cookieItems().find((cookie) => cookie.index === 2)!;
  expect(
    [...player.db.location_components.iter()].find(
      (row) => row.entityId === hidden.entityId,
    )?.locationEntityId,
  ).toBe(jarId);

  await player.reducers.act({ actionId: smashId, targetEntityId: jarId });

  // The break: hp component GONE (debris is not attackable)...
  await waitFor(
    () =>
      ![...player.db.hp_components.iter()].some(
        (row) => row.entityId === jarId,
      ),
    30000,
  );
  // ...the cookie SPILLED into the room...
  const roomOf = (entityId: bigint) =>
    [...player.db.location_components.iter()].find(
      (row) => row.entityId === entityId,
    )?.locationEntityId;
  await waitFor(() => roomOf(hidden.entityId) === roomOf(playerEntityId), 30000);
  // ...and the remains arrive as a NEW entity (the jar itself is gone —
  // it keeps its name in the narration that way).
  const shardsIndex = [...player.db.appearance_features.iter()].find(
    (row) => row.name === "test_shards",
  )!.index;
  await waitFor(
    () =>
      [...player.db.appearance_features_components.iter()].some(
        (row) =>
          row.entityId !== jarId &&
          row.appearanceFeatureIndexes.join(",") === `${shardsIndex}` &&
          roomOf(row.entityId) === roomOf(playerEntityId),
      ),
    30000,
  );
  expect(roomOf(jarId)).toBeUndefined();

  // The payoff: take and eat the spilled cookie.
  await player.reducers.act({ actionId: takeId, targetEntityId: hidden.entityId });
  await waitFor(() => roomOf(hidden.entityId) === playerEntityId, 30000);
  await player.reducers.act({ actionId: eatId, targetEntityId: hidden.entityId });
  await waitFor(() => myHp()?.mhp === 8, 30000);
  expect(popcount()).toBe(3);
}, 60000);
