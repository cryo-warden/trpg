import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import type { EntityEvent } from "../src/stdb/types";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { bossPack } from "./testAssets";

// Phase 22: defeat drops. Felling the boss claim's spawn DROPS one
// quest item per player present — anticipation: the reward is seen on
// the floor, taken, and eaten, riding the same bit logic as the hidden
// cookies. The payout is scoped to MY map instance: the other
// instance's warden still standing must not hold it. Eating the drop
// pays +2 mhp through the quest stat cache.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;
let myRoomIds: Set<bigint>;
let wardenEntityId: bigint;
let otherWardenEntityId: bigint;

const roomOf = (entityId: bigint): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.locationEntityId;

const hpOf = (entityId: bigint): number | undefined =>
  [...player.db.hp_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.hp;

const actionIdByName = (name: string): number =>
  [...player.db.actions.iter()].find((row) => row.name === name)!.id;

const myBitZero = (): boolean => {
  const questId = [...player.db.quests.iter()].find(
    (row) => row.name === "test_conquest",
  )!.id;
  const bytes =
    [...player.db.entities_quests_progress.iter()].find(
      (row) => row.entityId === playerEntityId && row.questId === questId,
    )?.bits.bytes ?? new Uint8Array();
  return ((bytes[0] ?? 0) & 1) === 1;
};

const moveTowards = async (targetRoomId: bigint) => {
  while (roomOf(playerEntityId) !== targetRoomId) {
    const here = roomOf(playerEntityId)!;
    // A 3-room chain: any path out of here that leads closer. BFS over
    // path entities, then take the first hop.
    const parents = new Map<bigint, bigint>([[here, here]]);
    const frontier = [here];
    while (frontier.length > 0 && !parents.has(targetRoomId)) {
      const room = frontier.shift()!;
      for (const path of [...player.db.path_components.iter()].filter(
        (row) => roomOf(row.entityId) === room,
      )) {
        if (!parents.has(path.destinationEntityId)) {
          parents.set(path.destinationEntityId, room);
          frontier.push(path.destinationEntityId);
        }
      }
    }
    let hop = targetRoomId;
    while (parents.get(hop) !== here) {
      hop = parents.get(hop)!;
    }
    const pathEntity = [...player.db.path_components.iter()].find(
      (row) => roomOf(row.entityId) === here && row.destinationEntityId === hop,
    )!;
    const before = roomOf(playerEntityId);
    await player.reducers.act({
      actionId: actionIdByName("test_move"),
      targetEntityId: pathEntity.entityId,
    });
    await waitFor(() => roomOf(playerEntityId) !== before, 30000);
  }
};

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
      "SELECT * FROM actions",
      "SELECT * FROM quests",
      "SELECT * FROM entities_quests_progress",
      "SELECT * FROM location_components",
      "SELECT * FROM location_map_components",
      "SELECT * FROM path_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM item_components",
      "SELECT * FROM enemy_controller_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
      "SELECT * FROM observable_events",
    ]);
  await player.reducers.createAccount({ name: "conqueror" });
  playerEntityId = await playerEntityIdFor(player, "conqueror");
  await waitFor(() => roomOf(playerEntityId) != null, 30000);

  const myInstanceId = [...player.db.location_map_components.iter()].find(
    (row) => row.entityId === roomOf(playerEntityId),
  )!.locationMapEntityId;
  myRoomIds = new Set(
    [...player.db.location_map_components.iter()]
      .filter((row) => row.locationMapEntityId === myInstanceId)
      .map((row) => row.entityId),
  );

  const wardens = [...player.db.enemy_controller_components.iter()].filter(
    (row) => roomOf(row.entityId) != null,
  );
  wardenEntityId = wardens.find((row) => myRoomIds.has(roomOf(row.entityId)!))!
    .entityId;
  otherWardenEntityId = wardens.find(
    (row) => !myRoomIds.has(roomOf(row.entityId)!),
  )!.entityId;
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

const questItemsIn = (roomId: bigint) =>
  [...player.db.item_components.iter()].filter(
    (row) =>
      row.itemRef.tag === "QuestItem" && roomOf(row.entityId) === roomId,
  );

test("felling my warden drops ONE sparkling reward — while the OTHER instance's warden still stands", async () => {
  expect(myBitZero()).toBe(false);
  const lairRoomId = roomOf(wardenEntityId)!;
  expect(questItemsIn(lairRoomId)).toEqual([]);

  await moveTowards(lairRoomId);
  // Strike until the warden falls (5 damage a blow, 10 hp).
  for (let blows = 0; (hpOf(wardenEntityId) ?? 0) > 0 && blows < 6; blows++) {
    const before = hpOf(wardenEntityId)!;
    await player.reducers.act({
      actionId: actionIdByName("test_strike"),
      targetEntityId: wardenEntityId,
    });
    await waitFor(() => (hpOf(wardenEntityId) ?? 0) < before, 30000);
  }
  expect(hpOf(wardenEntityId) ?? 0).toBeLessThanOrEqual(0);

  // The drop lands on the floor — one item, one player present — and the
  // bit is NOT granted yet: the reward must be picked up and eaten.
  await waitFor(() => questItemsIn(lairRoomId).length > 0, 30000);
  expect(questItemsIn(lairRoomId).length).toBe(1);
  expect(myBitZero()).toBe(false);

  // Instance-scoped payout: MY warden's fall dropped it even though the
  // admin instance's warden lives on.
  expect(hpOf(otherWardenEntityId)).toBe(10);
}, 90000);

test("take and eat the drop: the bit sets and pays +2 mhp through the quest cache", async () => {
  const cookieEntityId = questItemsIn(roomOf(wardenEntityId)!)[0]!.entityId;
  await player.reducers.act({
    actionId: actionIdByName("test_take"),
    targetEntityId: cookieEntityId,
  });
  await waitFor(() => roomOf(cookieEntityId) === playerEntityId, 30000);
  // The eat EVENT carries the stat delta it applied — the single source
  // of truth (the quest's per-bit block) rides the event for narration.
  // Event rows stream (insert callbacks) rather than persisting in the
  // client cache, so capture them as they arrive.
  const eatEvents: EntityEvent[] = [];
  player.db.observable_events.onInsert((_ctx, event) => {
    if (
      event.eventType.tag === "ActionEffect" &&
      event.eventType.value.tag === "Eat" &&
      event.ownerEntityId === playerEntityId
    ) {
      eatEvents.push(event);
    }
  });
  await player.reducers.act({
    actionId: actionIdByName("test_eat"),
    targetEntityId: cookieEntityId,
  });
  await waitFor(() => myBitZero(), 30000);
  await waitFor(() => eatEvents.length > 0, 30000);
  expect(eatEvents[0]!.statBlock?.mhp).toBe(2);
  await waitFor(
    () =>
      [...player.db.hp_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.mhp === 12,
    30000,
  );
});
