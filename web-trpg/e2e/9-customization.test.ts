import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { customizationPack } from "./testAssets";

// Phase 9: inventory + customizations. Carrying IS location: taking a room item
// pulls it into the player. EVERYTHING equipped is a concrete item ENTITY —
// the reducers take entity ids, never gear asset ids. One armor slot and up to
// four relics across all stances. Armaments resolve OVERRIDE-OR-DEFAULT: the
// equip menu builds a DEFAULT wielded set (take's auto-wield and the
// equip/unequip item actions edit it), and a stance's assignment OVERRIDES it.
// Ownership is presence: an item is one entity, so there is no counting and no
// grip gate — over-equipping just drives hand negative.

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
  await admin.reducers.pushAssets({ assetPack: customizationPack() });

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
      "SELECT * FROM stance_customizations_components",
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

const soleItemIdOfKind = (tag: "Armor" | "Relic"): bigint =>
  [...player.db.item_components.iter()].find((row) => row.itemRef.tag === tag)!
    .entityId;

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("taking a sword pockets it AND wields it", async () => {
  const swordItemId = armamentItemId(idByName(player.db.armaments, "test_sword"));
  expect(carriedItemIds()).not.toContain(swordItemId);

  const takeId = idByName(player.db.actions, "test_take");
  await player.reducers.act({
    actionId: takeId,
    targetEntityId: swordItemId,
  });
  await waitFor(() => carriedItemIds().includes(swordItemId), 30000);
  // The auto-wield: the blade goes straight into hand — its granted attack
  // appears without any menu step.
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
}, 60000);

test("armor and relics require ownership; owned ones equip", async () => {
  const jerkinItemId = soleItemIdOfKind("Armor");
  const charmItemId = soleItemIdOfKind("Relic");

  // The jerkin still lies in the room: not owned, so wearing it fails.
  await expect(
    player.reducers.setArmor({ itemEntityId: jerkinItemId }),
  ).rejects.toThrow(/owned/);

  const takeId = idByName(player.db.actions, "test_take");
  await player.reducers.act({ actionId: takeId, targetEntityId: jerkinItemId });
  await waitFor(() => carriedItemIds().includes(jerkinItemId), 30000);
  await player.reducers.act({ actionId: takeId, targetEntityId: charmItemId });
  await waitFor(() => carriedItemIds().includes(charmItemId), 30000);

  await player.reducers.setArmor({ itemEntityId: jerkinItemId });
  await player.reducers.setRelics({ relicEntityIds: [charmItemId] });
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
  const clubItemId = armamentItemId(clubId);
  const duelingId = idByName(player.db.stances, "test_dueling");
  const standingId = idByName(player.db.stances, "test_standing");

  // The club joins the DEFAULT set beside the sword.
  const takeId = idByName(player.db.actions, "test_take");
  await player.reducers.act({ actionId: takeId, targetEntityId: clubItemId });
  await waitFor(
    () =>
      myActionNames().includes("test_slash") &&
      myActionNames().includes("test_smash"),
    30000,
  );

  // Overriding the ACTIVE stance with the club ITEM alone applies
  // IMMEDIATELY: no stance change, the blade leaves the hands.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentEntityIds: [clubItemId],
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
    armamentEntityIds: [],
  });
  await waitFor(() => !myActionNames().includes("test_smash"), 30000);
  expect(myActionNames()).not.toContain("test_slash");

  // None removes the override: fall back to the DEFAULT set — sword and
  // club both return.
  await player.reducers.assignStanceArmaments({
    stanceId: standingId,
    armamentEntityIds: undefined,
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

  // Outside the candidate set: rejected at assignment time.
  await expect(
    player.reducers.assignStanceActions({
      stanceId: standingId,
      actionIds: [999999],
    }),
  ).rejects.toThrow(/set/);

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
  const clubItemId = armamentItemId(clubId);
  const myDefaults = (): bigint[] => [
    ...([...player.db.default_armaments_components.iter()].find(
      (row) => row.entityId === playerEntityId,
    )?.armamentEntityIds ?? []),
  ];

  // Standing holds the default set (no override). Unequipping the sword
  // ITEM removes it from the default; the hands re-resolve to club only.
  const unequipId = idByName(player.db.actions, "test_unequip");
  await player.reducers.act({
    actionId: unequipId,
    targetEntityId: swordItemId,
  });
  await waitFor(() => !myActionNames().includes("test_slash"), 30000);
  expect(myDefaults()).toEqual([clubItemId]);
  expect(myActionNames()).toContain("test_smash");

  // Equipping it back returns it to the default slot.
  const equipId = idByName(player.db.actions, "test_equip");
  await player.reducers.act({
    actionId: equipId,
    targetEntityId: swordItemId,
  });
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
  expect(myDefaults()).toEqual([clubItemId, swordItemId]);
}, 60000);

test("the DEFAULT action bar: set-validated, pinned by stances without a bar of their own", async () => {
  const takeId = idByName(player.db.actions, "test_take");
  const slashId = idByName(player.db.actions, "test_slash");
  const duelingId = idByName(player.db.stances, "test_dueling");
  const myBar = () =>
    [...player.db.pinned_actions_components.iter()].find(
      (r) => r.entityId === playerEntityId,
    );

  // Outside the DEFAULT configuration's candidate set: rejected.
  await expect(
    player.reducers.setDefaultActions({ actionIds: [999999] }),
  ).rejects.toThrow(/set/);

  // A valid default bar (test_slash rides the default sword's grant).
  // The ACTIVE stance (standing) holds its own bar override, so the
  // pinned bar stays put for now.
  await player.reducers.setDefaultActions({ actionIds: [takeId, slashId] });

  // Adopting a stance with NO bar assignment of its own pins the
  // DEFAULT bar — the same fallback rule the armaments follow.
  await player.reducers.setStance({ stanceId: duelingId });
  await waitFor(
    () =>
      [...(myBar()?.actionIds ?? [])].join(",") === `${takeId},${slashId}`,
    30000,
  );
}, 60000);

test("set_default_armaments configures IMMEDIATELY: the menu path, hands re-resolving", async () => {
  const swordId = idByName(player.db.armaments, "test_sword");
  const clubId = idByName(player.db.armaments, "test_club");
  const swordItemId = armamentItemId(swordId);
  const clubItemId = armamentItemId(clubId);
  const jerkinItemId = soleItemIdOfKind("Armor");
  const myDefaults = (): bigint[] => [
    ...([...player.db.default_armaments_components.iter()].find(
      (row) => row.entityId === playerEntityId,
    )?.armamentEntityIds ?? []),
  ];

  // Kind is checked: an armor item is not a wieldable armament.
  await expect(
    player.reducers.setDefaultArmaments({ armamentEntityIds: [jerkinItemId] }),
  ).rejects.toThrow(/armament/);

  // Club alone: the configuration row lands AT ONCE, and the hands
  // follow (dueling holds no override — it rides the defaults). Whether
  // any in-fiction action queues is the server's business; the client
  // only configured.
  await player.reducers.setDefaultArmaments({ armamentEntityIds: [clubItemId] });
  await waitFor(() => myDefaults().join(",") === `${clubItemId}`, 30000);
  await waitFor(() => !myActionNames().includes("test_slash"), 30000);
  expect(myActionNames()).toContain("test_smash");

  // Both back, for whatever follows.
  await player.reducers.setDefaultArmaments({
    armamentEntityIds: [clubItemId, swordItemId],
  });
  await waitFor(() => myActionNames().includes("test_slash"), 30000);
}, 60000);

test("the four-relic cap is enforced", async () => {
  const charmItemId = soleItemIdOfKind("Relic");
  await expect(
    player.reducers.setRelics({
      relicEntityIds: [
        charmItemId,
        charmItemId,
        charmItemId,
        charmItemId,
        charmItemId,
      ],
    }),
  ).rejects.toThrow(/At most 4/);
}, 60000);
