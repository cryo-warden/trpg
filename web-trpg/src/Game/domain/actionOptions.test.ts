import { test, expect } from "bun:test";
import { isAlly } from "./actionOptions";

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
