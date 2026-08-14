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
const enemy = {
  playerEntity: 1n,
  target: 2n,
  playerAllegianceId: 10n,
  targetAllegianceId: 20n,
};
const ally = {
  playerEntity: 1n,
  target: 2n,
  playerAllegianceId: 10n,
  targetAllegianceId: 10n,
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
    }),
  ).toEqual([attuneId]);
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
    }),
  ).toEqual([]);
});
