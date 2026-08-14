import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { loadoutPack } from "./testAssets";

// Phase 9: inventory + loadouts. Carrying IS location: taking a room item
// pulls it into the player. Loadouts: one armor slot and up to four relics
// across all stances. Armaments resolve OVERRIDE-OR-DEFAULT: the equip
// menu builds a DEFAULT wielded set (take's auto-wield and the
// equip/unequip item actions edit it), and a stance's assignment OVERRIDES
// it — never a requirement. Everything the stance menu derives applies
// immediately for the ACTIVE stance.

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
      "SELECT * FROM default_armaments_components",
      "SELECT * FROM pinned_actions_components",
      "SELECT * FROM stance_loadouts_components",
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
  await waitFor(() => player.db.item_components.count() === 4n, 30000);
}, 60000);

const armamentItemId = (armamentAssetId: number): bigint =>
  [...player.db.item_components.iter()].find(
    (row) =>
      row.itemRef.tag === "Armament" && row.itemRef.value === armamentAssetId,
  )!.entityId;

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("taking a sword pockets it AND wields it while the grip allows", async () => {
  const swordItemId = armamentItemId(idByName(player.db.armaments, "test_sword"));
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

test("a stance assignment OVERRIDES the default set; clearing it falls back", async () => {
  const clubId = idByName(player.db.armaments, "test_club");
  const duelingId = idByName(player.db.stances, "test_dueling");
  const standingId = idByName(player.db.stances, "test_standing");

  // The club joins the DEFAULT set beside the sword.
  const takeId = idByName(player.db.actions, "test_take");
  await player.reducers.act({
    actionId: takeId,
    targetEntityId: armamentItemId(clubId),
  });
  await waitFor(
    () =>
      myActionNames().includes("test_slash") &&
      myActionNames().includes("test_smash"),
    30000,
  );

  // Overriding the ACTIVE stance with the club alone applies IMMEDIATELY:
  // no stance change, the blade leaves the hands.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentIds: [clubId],
  });
  await waitFor(() => !myActionNames().includes("test_slash"), 30000);
  expect(myActionNames()).toContain("test_smash");

  // With no blade in the base, the blade stance refuses.
  await expect(
    player.reducers.setStance({ stanceId: duelingId }),
  ).rejects.toThrow(/requirements/);

  // Some([]) is DELIBERATELY BARE HANDS — explicit intent, not fallback.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentIds: [],
  });
  await waitFor(() => !myActionNames().includes("test_smash"), 30000);
  expect(myActionNames()).not.toContain("test_slash");

  // None removes the override: fall back to the DEFAULT set — sword and
  // club both return.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentIds: undefined,
  });
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
  expect(myActionNames()).toContain("test_smash");

  // Dueling assigns nothing either: it fights with the default too.
  await player.reducers.setStance({ stanceId: duelingId });
  await waitFor(
    () =>
      [...player.db.active_stance_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.stanceId === duelingId,
    30000,
  );
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
}, 60000);

test("bar assignments: on adoption for other stances, INSTANT for the active one", async () => {
  const takeId = idByName(player.db.actions, "test_take");
  const equipId = idByName(player.db.actions, "test_equip");
  const standingId = idByName(player.db.stances, "test_standing");
  const myBar = () =>
    [...player.db.pinned_actions_components.iter()].find(
      (r) => r.entityId === playerEntityId,
    );

  // Outside the candidate pool: rejected at assignment time.
  await expect(
    player.reducers.assignStanceActions({
      stanceId: standingId,
      actionIds: [999999],
    }),
  ).rejects.toThrow(/pool/);

  // Standing is NOT active (we are in dueling): the bar waits for the
  // adoption to pay its round.
  await player.reducers.assignStanceActions({
    stanceId: standingId,
    actionIds: [takeId],
  });
  await player.reducers.setStance({ stanceId: standingId });
  await waitFor(
    () => [...(myBar()?.actionIds ?? [])].join(",") === `${takeId}`,
    30000,
  );

  // Assigning the ACTIVE stance's bar applies IMMEDIATELY — everything
  // the stance menu derives does.
  await player.reducers.assignStanceActions({
    stanceId: standingId,
    actionIds: [takeId, equipId],
  });
  await waitFor(
    () =>
      [...(myBar()?.actionIds ?? [])].join(",") === `${takeId},${equipId}`,
    30000,
  );
}, 60000);

test("unequip/equip actions edit the DEFAULT slot; hands re-resolve", async () => {
  const swordId = idByName(player.db.armaments, "test_sword");
  const clubId = idByName(player.db.armaments, "test_club");
  const swordItemId = armamentItemId(swordId);
  const myDefaults = () => [
    ...([...player.db.default_armaments_components.iter()].find(
      (row) => row.entityId === playerEntityId,
    )?.armamentIds ?? []),
  ];

  // Standing holds the default set (no override). Unequipping the sword
  // ITEM removes it from the default; the hands re-resolve to club only.
  const unequipId = idByName(player.db.actions, "test_unequip");
  await player.reducers.act({
    actionId: unequipId,
    targetEntityId: swordItemId,
  });
  await waitFor(() => !myActionNames().includes("test_slash"), 30000);
  expect(myDefaults()).toEqual([clubId]);
  expect(myActionNames()).toContain("test_smash");

  // Equipping it back returns it to the default slot.
  const equipId = idByName(player.db.actions, "test_equip");
  await player.reducers.act({
    actionId: equipId,
    targetEntityId: swordItemId,
  });
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
  expect(myDefaults()).toEqual([clubId, swordId]);
}, 60000);

test("the four-relic cap is enforced", async () => {
  const charmId = idByName(player.db.relics, "test_charm");
  await expect(
    player.reducers.setRelics({
      relicIds: [charmId, charmId, charmId, charmId, charmId],
    }),
  ).rejects.toThrow(/At most 4/);
}, 60000);
