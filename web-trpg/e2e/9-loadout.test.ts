import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { loadoutPack } from "./testAssets";

// Phase 9: inventory + loadouts. Carrying IS location: taking a room item
// pulls it into the player. Loadouts: one armor slot and up to four relics
// across all stances; each stance gets its own assigned armaments, and
// swapping stances re-arms from the assignment.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const idByName = (
  table: { iter: () => Iterable<{ id: number; name: string }> },
  name: string,
): number => [...table.iter()].find((row) => row.name === name)!.id;

const myActionNames = (): string[] => {
  const row = [...player.db.actions_components.iter()].find(
    (r) => r.entityId === playerEntityId,
  );
  const names = new Map(
    [...player.db.actions.iter()].map((r) => [r.id, r.name]),
  );
  return row == null ? [] : [...row.actionIds].map((id) => names.get(id)!);
};

const carriedItemIds = (): bigint[] =>
  [...player.db.location_components.iter()]
    .filter((row) => row.locationEntityId === playerEntityId)
    .map((row) => row.entityId);

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: loadoutPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM stances",
      "SELECT * FROM armaments",
      "SELECT * FROM armors",
      "SELECT * FROM relics",
      "SELECT * FROM actions_components",
      "SELECT * FROM active_stance_components",
      "SELECT * FROM equipment_components",
      "SELECT * FROM armor_components",
      "SELECT * FROM relics_components",
      "SELECT * FROM item_components",
      "SELECT * FROM location_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM player_controller_components",
    ]);
  await player.reducers.createAccount({ name: "collector" });

  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  playerEntityId = [...player.db.player_controller_components.iter()][0]
    .entityId;
  await waitFor(() => myActionNames().length > 0, 30000);
  await waitFor(() => player.db.item_components.count() === 3n, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("taking a room item moves it into the player (carrying IS location)", async () => {
  const swordItemId = [...player.db.item_components.iter()].find(
    (row) => row.itemRef.tag === "Armament",
  )!.entityId;
  expect(carriedItemIds()).not.toContain(swordItemId);

  const takeId = idByName(player.db.actions, "test_take");
  await player.reducers.act({
    actionId: takeId,
    targetEntityId: swordItemId,
  });
  await waitFor(() => carriedItemIds().includes(swordItemId), 30000);
  expect(carriedItemIds()).toContain(swordItemId);
}, 60000);

test("armor and relics require ownership; owned ones equip", async () => {
  const jerkinId = idByName(player.db.armors, "test_jerkin");
  // The jerkin still lies in the room: not owned, so wearing it fails.
  await expect(
    player.reducers.setArmor({ armorId: jerkinId }),
  ).rejects.toThrow(/owned/);

  const jerkinItemId = [...player.db.item_components.iter()].find(
    (row) => row.itemRef.tag === "Armor",
  )!.entityId;
  const charmItemId = [...player.db.item_components.iter()].find(
    (row) => row.itemRef.tag === "Relic",
  )!.entityId;
  const takeId = idByName(player.db.actions, "test_take");
  await player.reducers.act({ actionId: takeId, targetEntityId: jerkinItemId });
  await waitFor(() => carriedItemIds().includes(jerkinItemId), 30000);
  await player.reducers.act({ actionId: takeId, targetEntityId: charmItemId });
  await waitFor(() => carriedItemIds().includes(charmItemId), 30000);

  await player.reducers.setArmor({ armorId: jerkinId });
  await player.reducers.setRelics({
    relicIds: [idByName(player.db.relics, "test_charm")],
  });
  await waitFor(() => player.db.armor_components.count() > 0, 30000);
  // Armor defense flows into the hp component through the equipment cache.
  await waitFor(
    () =>
      [...player.db.hp_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.defense === 1,
    30000,
  );
}, 60000);

test("assigning the taken sword to a stance arms it on swap", async () => {
  const swordId = idByName(player.db.armaments, "test_sword");
  const duelingId = idByName(player.db.stances, "test_dueling");
  const standingId = idByName(player.db.stances, "test_standing");

  // Unarmed, the blade stance is unreachable.
  await expect(
    player.reducers.setStance({ stanceId: duelingId }),
  ).rejects.toThrow(/requirements/);

  await player.reducers.assignStanceArmaments({
    stanceId: duelingId,
    armamentIds: [swordId],
  });

  // Still standing (no assignment there): still no blade, no slash.
  expect(myActionNames()).not.toContain("test_slash");

  // Assignments alone do not arm: dueling is only reachable once the blade
  // is IN HAND — swap while standing keeps failing until standing itself is
  // assigned the sword.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentIds: [swordId],
  });
  await waitFor(() => myActionNames().includes("test_slash"), 30000);

  await player.reducers.setStance({ stanceId: duelingId });
  await waitFor(
    () =>
      [...player.db.active_stance_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.stanceId === duelingId,
    30000,
  );
  expect(myActionNames()).toContain("test_slash");
}, 60000);

test("the four-relic cap is enforced", async () => {
  const charmId = idByName(player.db.relics, "test_charm");
  await expect(
    player.reducers.setRelics({
      relicIds: [charmId, charmId, charmId, charmId, charmId],
    }),
  ).rejects.toThrow(/At most 4/);
}, 60000);
