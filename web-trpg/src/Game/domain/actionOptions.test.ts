import { test, expect } from "bun:test";
import { ACTIONS } from "../assets/actions";
import { getActionOptions, isAlly } from "./actionOptions";

// The test plays both roles: ids follow the Records' enumeration order (as
// push_assets interns them), and actionAssetOf is the id -> asset resolution
// the hooks normally provide from the subscribed actions table.
const orderedActions = Object.values(ACTIONS);
const actionAssetOf = (id: number) => orderedActions[id] ?? null;
const actionIdOf = (name: keyof typeof ACTIONS) =>
  Object.keys(ACTIONS).indexOf(name);

test("an entity is always its own ally", () => {
  expect(
    isAlly({
      playerEntity: 1n,
      target: 1n,
      playerAllegianceId: null,
      targetAllegianceId: null,
    }),
  ).toBe(true);
});

test("entities sharing a defined allegiance are allies", () => {
  expect(
    isAlly({
      playerEntity: 1n,
      target: 2n,
      playerAllegianceId: 9n,
      targetAllegianceId: 9n,
    }),
  ).toBe(true);
});

test("different allegiances are not allies", () => {
  expect(
    isAlly({
      playerEntity: 1n,
      target: 2n,
      playerAllegianceId: 9n,
      targetAllegianceId: 8n,
    }),
  ).toBe(false);
});

test("an unknown allegiance is not an ally (unless it is the entity itself)", () => {
  expect(
    isAlly({
      playerEntity: 1n,
      target: 2n,
      playerAllegianceId: null,
      targetAllegianceId: 9n,
    }),
  ).toBe(false);
});

const attackId = actionIdOf("bop");
const buffId = actionIdOf("divine_heal");
const moveId = actionIdOf("move");
const allIds = [attackId, buffId, moveId];
const NO_SPECIAL_ACTIONS = {
  take: null,
  drop: null,
  equip: null,
  unequip: null,
  eat: null,
};
const enemy = {
  playerEntity: 1n,
  target: 2n,
  playerAllegianceId: 10n,
  targetAllegianceId: 20n,
  targetOfferedActionIds: [],
  targetCoLocatedWithPlayer: false,
  specialActionIds: NO_SPECIAL_ACTIONS,
  targetWithinTakeReach: false,
  actorStats: null,
};
const ally = {
  playerEntity: 1n,
  target: 2n,
  playerAllegianceId: 10n,
  targetAllegianceId: 10n,
  targetOfferedActionIds: [],
  targetCoLocatedWithPlayer: false,
  specialActionIds: NO_SPECIAL_ACTIONS,
  targetWithinTakeReach: false,
  actorStats: null,
};

test("getActionOptions offers attacks and moves against a hostile, reachable target", () => {
  expect(
    getActionOptions({
      ...enemy,
      actionIds: allIds,
      actionAssetOf,
      targetHasHp: true,
      targetHasPath: true,
      targetHasItem: false,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: null,
    }),
  ).toEqual([attackId, moveId]);
});

test("getActionOptions offers buffs against an ally with hp", () => {
  expect(
    getActionOptions({
      ...ally,
      actionIds: allIds,
      actionAssetOf,
      targetHasHp: true,
      targetHasPath: false,
      targetHasItem: false,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: null,
    }),
  ).toEqual([buffId]);
});

test("getActionOptions offers nothing when the target has no hp and no path", () => {
  expect(
    getActionOptions({
      ...enemy,
      actionIds: allIds,
      actionAssetOf,
      targetHasHp: false,
      targetHasPath: false,
      targetHasItem: false,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: null,
    }),
  ).toEqual([]);
});

test("an item beside you offers take, never drop", () => {
  const takeId = actionIdOf("take");
  const dropId = actionIdOf("drop");
  expect(
    getActionOptions({
      ...enemy,
      actionIds: [...allIds, takeId, dropId],
      actionAssetOf,
      targetHasHp: false,
      targetHasPath: false,
      targetHasItem: true,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: null,
    }),
  ).toEqual([takeId]);
});

test("a carried item offers drop, never take — decided by entity containment alone", () => {
  const takeId = actionIdOf("take");
  const dropId = actionIdOf("drop");
  expect(
    getActionOptions({
      ...enemy,
      actionIds: [...allIds, takeId, dropId],
      actionAssetOf,
      targetHasHp: false,
      targetHasPath: false,
      targetHasItem: true,
      targetCarriedByPlayer: true,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: null,
    }),
  ).toEqual([dropId]);
});

test("a carried item offers equip when pocketed, unequip when equipped", () => {
  const equipId = actionIdOf("equip");
  const unequipId = actionIdOf("unequip");
  const carriedItem = {
    ...enemy,
    actionIds: [equipId, unequipId],
    actionAssetOf,
    targetHasHp: false,
    targetHasPath: false,
    targetHasItem: true,
    targetCarriedByPlayer: true,
    targetHasCheckpointObject: false,
    targetQuestItemFreshness: null,
  };
  expect(
    getActionOptions({ ...carriedItem, targetIsEquipped: false }),
  ).toEqual([equipId]);
  expect(
    getActionOptions({ ...carriedItem, targetIsEquipped: true }),
  ).toEqual([unequipId]);
  // An item on the ground offers neither.
  expect(
    getActionOptions({
      ...carriedItem,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
    }),
  ).toEqual([]);
});

test("getActionOptions offers attune against a checkpoint object", () => {
  const attuneId = actionIdOf("attune");
  expect(
    getActionOptions({
      ...enemy,
      actionIds: [...allIds, attuneId],
      actionAssetOf,
      targetHasHp: false,
      targetHasPath: false,
      targetHasItem: false,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
      targetHasCheckpointObject: true,
      targetQuestItemFreshness: null,
    }),
  ).toEqual([attuneId]);
});

test("only a FRESH carried quest item offers Eat; stinky never does", () => {
  const eatId = actionIdOf("eat");
  const carriedCookie = {
    ...enemy,
    actionIds: [eatId],
    actionAssetOf,
    targetHasHp: false,
    targetHasPath: false,
    targetHasItem: true,
    targetCarriedByPlayer: true,
    targetIsEquipped: false,
    targetHasCheckpointObject: false,
  };
  expect(
    getActionOptions({
      ...carriedCookie,
      targetQuestItemFreshness: "fresh" as const,
    }),
  ).toEqual([eatId]);
  expect(
    getActionOptions({
      ...carriedCookie,
      targetQuestItemFreshness: "stinky" as const,
    }),
  ).toEqual([]);
  // Not a quest item at all: nothing to eat.
  expect(
    getActionOptions({ ...carriedCookie, targetQuestItemFreshness: null }),
  ).toEqual([]);
});

test("a quest item never offers equip — cookies are food, not gear", () => {
  const equipId = actionIdOf("equip");
  expect(
    getActionOptions({
      ...enemy,
      actionIds: [equipId],
      actionAssetOf,
      targetHasHp: false,
      targetHasPath: false,
      targetHasItem: true,
      targetCarriedByPlayer: true,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: "fresh" as const,
    }),
  ).toEqual([]);
});

test("a target's offered interactions appear without the player knowing them", () => {
  const openId = actionIdOf("open");
  const dumpId = actionIdOf("dump");
  const besideChest = {
    ...enemy,
    // The player knows NONE of these — the chest offers them.
    actionIds: allIds,
    actionAssetOf,
    targetHasHp: true,
    targetHasPath: false,
    targetHasItem: false,
    targetCarriedByPlayer: false,
    targetIsEquipped: false,
    targetHasCheckpointObject: false,
    targetQuestItemFreshness: null,
    targetOfferedActionIds: [openId, dumpId],
    targetCoLocatedWithPlayer: true,
  };
  expect(getActionOptions(besideChest)).toEqual([attackId, openId, dumpId]);
  // Out of reach, the offer means nothing.
  expect(
    getActionOptions({ ...besideChest, targetCoLocatedWithPlayer: false }),
  ).toEqual([attackId]);
});

test("a stray non-Interact id in an offered list never leaks into the options", () => {
  expect(
    getActionOptions({
      ...ally,
      actionIds: [],
      actionAssetOf,
      targetHasHp: true,
      targetHasPath: false,
      targetHasItem: false,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: null,
      // A buff the player doesn't know, "offered" by the target: refused —
      // offers carry Interact actions alone.
      targetOfferedActionIds: [buffId],
      targetCoLocatedWithPlayer: true,
    }),
  ).toEqual([]);
});

const SPECIAL_ACTIONS = {
  take: actionIdOf("take"),
  drop: actionIdOf("drop"),
  equip: actionIdOf("equip"),
  unequip: actionIdOf("unequip"),
  eat: actionIdOf("eat"),
};

test("item verbs DERIVE from the target: no actor knowledge required", () => {
  const floorItem = {
    ...enemy,
    // The player knows NOTHING.
    actionIds: [],
    actionAssetOf,
    targetHasHp: false,
    targetHasPath: false,
    targetHasItem: true,
    targetCarriedByPlayer: false,
    targetIsEquipped: false,
    targetHasCheckpointObject: false,
    targetQuestItemFreshness: null,
    specialActionIds: SPECIAL_ACTIONS,
    targetWithinTakeReach: true,
    targetCoLocatedWithPlayer: true,
  };
  // On the floor within reach: take, nothing else.
  expect(getActionOptions(floorItem)).toEqual([SPECIAL_ACTIONS.take]);
  // Out of reach (a closed container's insides): nothing.
  expect(
    getActionOptions({ ...floorItem, targetWithinTakeReach: false }),
  ).toEqual([]);
  // Carried gear, pocketed: drop + equip.
  expect(
    getActionOptions({
      ...floorItem,
      targetCarriedByPlayer: true,
      targetCoLocatedWithPlayer: false,
      targetWithinTakeReach: false,
    }),
  ).toEqual([SPECIAL_ACTIONS.drop, SPECIAL_ACTIONS.equip]);
  // Carried gear, equipped: drop + unequip.
  expect(
    getActionOptions({
      ...floorItem,
      targetCarriedByPlayer: true,
      targetIsEquipped: true,
      targetCoLocatedWithPlayer: false,
      targetWithinTakeReach: false,
    }),
  ).toEqual([SPECIAL_ACTIONS.drop, SPECIAL_ACTIONS.unequip]);
  // A carried FRESH cookie: drop + eat (food, never equip).
  expect(
    getActionOptions({
      ...floorItem,
      targetCarriedByPlayer: true,
      targetQuestItemFreshness: "fresh" as const,
      targetCoLocatedWithPlayer: false,
      targetWithinTakeReach: false,
    }),
  ).toEqual([SPECIAL_ACTIONS.drop, SPECIAL_ACTIONS.eat]);
  // A stinky one: drop alone.
  expect(
    getActionOptions({
      ...floorItem,
      targetCarriedByPlayer: true,
      targetQuestItemFreshness: "stinky" as const,
      targetCoLocatedWithPlayer: false,
      targetWithinTakeReach: false,
    }),
  ).toEqual([SPECIAL_ACTIONS.drop]);
});

test("an unmet actor requirement hides a derived or offered option", () => {
  // A requirements-carrying asset stands in as the registered take: move
  // requires gait 1.
  const gatedTake = actionIdOf("move");
  const floorItem = {
    ...enemy,
    actionIds: [],
    actionAssetOf,
    targetHasHp: false,
    targetHasPath: false,
    targetHasItem: true,
    targetCarriedByPlayer: false,
    targetIsEquipped: false,
    targetHasCheckpointObject: false,
    targetQuestItemFreshness: null,
    specialActionIds: { ...NO_SPECIAL_ACTIONS, take: gatedTake },
    targetWithinTakeReach: true,
    targetCoLocatedWithPlayer: true,
  };
  // gait 0 fails the shuffle's gait 1 requirement; gait 1 meets it.
  expect(getActionOptions({ ...floorItem, actorStats: { gait: 0 } })).toEqual(
    [],
  );
  expect(getActionOptions({ ...floorItem, actorStats: { gait: 1 } })).toEqual([
    gatedTake,
  ]);
});

test("getActionOptions drops unknown action ids", () => {
  expect(
    getActionOptions({
      ...enemy,
      actionIds: [9999],
      actionAssetOf,
      targetHasHp: true,
      targetHasPath: true,
      targetHasItem: false,
      targetCarriedByPlayer: false,
      targetIsEquipped: false,
      targetHasCheckpointObject: false,
      targetQuestItemFreshness: null,
    }),
  ).toEqual([]);
});
