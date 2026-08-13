import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
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
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "collector" });

  playerEntityId = await playerEntityIdFor(player, "collector");
  await waitFor(() => myActionNames().length > 0, 30000);
  await waitFor(() => player.db.item_components.count() === 3n, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("taking a sword pockets it AND wields it while the grip allows", async () => {
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
  // The auto-wield: a free hand means the blade goes straight into it —
  // its granted attack appears without any menu step.
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
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

test("loadout assignments re-arm on swap; a pocketed blade is not IN HAND", async () => {
  const swordId = idByName(player.db.armaments, "test_sword");
  const duelingId = idByName(player.db.stances, "test_dueling");
  const standingId = idByName(player.db.stances, "test_standing");

  // The auto-wielded blade makes the blade stance reachable right away.
  await player.reducers.setStance({ stanceId: duelingId });
  await waitFor(
    () =>
      [...player.db.active_stance_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.stanceId === duelingId,
    30000,
  );

  // Assign standing EMPTY and swap back: the loadout re-arm dis-arms —
  // the sword is still POCKETED (owned) but no longer in hand.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentIds: [],
  });
  await player.reducers.setStance({ stanceId: standingId });
  await waitFor(() => !myActionNames().includes("test_slash"), 30000);

  // Bare-handed, the blade stance refuses: pocketed gear is not wielded.
  await expect(
    player.reducers.setStance({ stanceId: duelingId }),
  ).rejects.toThrow(/requirements/);

  // Assigning to the ACTIVE stance is CONFIGURATION ONLY — nothing changes
  // in hand until a stance change pays the round. Re-entering standing
  // re-arms from the fresh assignment.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentIds: [swordId],
  });
  expect(myActionNames()).not.toContain("test_slash");
  await player.reducers.setStance({ stanceId: standingId });
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
  await player.reducers.setStance({ stanceId: duelingId });
  await waitFor(
    () =>
      [...player.db.active_stance_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.stanceId === duelingId,
    30000,
  );
}, 60000);

test("the four-relic cap is enforced", async () => {
  const charmId = idByName(player.db.relics, "test_charm");
  await expect(
    player.reducers.setRelics({
      relicIds: [charmId, charmId, charmId, charmId, charmId],
    }),
  ).rejects.toThrow(/At most 4/);
}, 60000);
