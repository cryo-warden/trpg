import { test, expect } from "bun:test";
import { isFocusValid } from "./focusValidity";

// World: player 1 stands in room 10 beside enemy 3; carries bag 5, which
// holds coin 6. Room 20 holds stranger 7. Entity 9 is unknown (no location).
const locations = new Map<bigint, bigint>([
  [1n, 10n],
  [3n, 10n],
  [5n, 1n],
  [6n, 5n],
  [7n, 20n],
]);
const dead = new Set<bigint>();
const inputs = (focus: bigint) => ({
  focus,
  playerEntity: 1n,
  playerLocation: 10n,
  locationOf: (id: bigint) => locations.get(id) ?? null,
  isDead: (id: bigint) => dead.has(id),
});

test("siblings, self, carried things, their contents, and the room are all focusable", () => {
  expect(isFocusValid(inputs(3n))).toBe(true); // sibling
  expect(isFocusValid(inputs(1n))).toBe(true); // self
  expect(isFocusValid(inputs(5n))).toBe(true); // carried
  expect(isFocusValid(inputs(6n))).toBe(true); // inside the carried bag
  expect(isFocusValid(inputs(10n))).toBe(true); // the location itself
});

test("an unknown entity is assumed gone and loses the focus", () => {
  expect(isFocusValid(inputs(9n))).toBe(false);
});

test("an entity in another room is not focusable", () => {
  expect(isFocusValid(inputs(7n))).toBe(false);
});

test("the dead drop the focus", () => {
  dead.add(3n);
  expect(isFocusValid(inputs(3n))).toBe(false);
  dead.delete(3n);
});
