import { test, expect } from "bun:test";
import { actions } from "../assets";
import { getActionOptions, isAlly } from "./actionOptions";

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

const attackId = actions.findIndex((a) => a.type === "Attack");
const buffId = actions.findIndex((a) => a.type === "Buff");
const moveId = actions.findIndex((a) => a.type === "Move");
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
      targetHasHp: true,
      targetHasPath: true,
    }),
  ).toEqual([attackId, moveId]);
});

test("getActionOptions offers buffs against an ally with hp", () => {
  expect(
    getActionOptions({
      ...ally,
      actionIds: allIds,
      targetHasHp: true,
      targetHasPath: false,
    }),
  ).toEqual([buffId]);
});

test("getActionOptions offers nothing when the target has no hp and no path", () => {
  expect(
    getActionOptions({
      ...enemy,
      actionIds: allIds,
      targetHasHp: false,
      targetHasPath: false,
    }),
  ).toEqual([]);
});

test("getActionOptions drops unknown action ids", () => {
  expect(
    getActionOptions({
      ...enemy,
      actionIds: [9999],
      targetHasHp: true,
      targetHasPath: true,
    }),
  ).toEqual([]);
});
