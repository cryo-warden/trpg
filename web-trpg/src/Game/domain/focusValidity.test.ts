import { test, expect } from "bun:test";
import { isFocusValid } from "./focusValidity";

// World: player 1 stands in room 10 beside enemy 3; carries bag 5, which
// holds coin 6. Room 20 holds stranger 7. Entity 9 is unknown (no location).
// Sky 51 hangs in the outdoors (50) — an OUTER entity the room shows
// through its exterior edge, not a sibling of the player.
const locations = new Map<bigint, bigint>([
  [1n, 10n],
  [3n, 10n],
  [5n, 1n],
  [6n, 5n],
  [7n, 20n],
  [51n, 50n],
]);
const inputs = (focus: bigint) => ({
  focus,
  playerEntity: 1n,
  playerLocation: 10n,
  visibleOuterEntityIds: new Set<bigint>([51n]),
  locationOf: (id: bigint) => locations.get(id) ?? null,
});

test("siblings, self, carried things, their contents, and the room are all focusable", () => {
  expect(isFocusValid(inputs(3n))).toBe(true); // sibling
  expect(isFocusValid(inputs(1n))).toBe(true); // self
  expect(isFocusValid(inputs(5n))).toBe(true); // carried
  expect(isFocusValid(inputs(6n))).toBe(true); // inside the carried bag
  expect(isFocusValid(inputs(10n))).toBe(true); // the location itself
});

test("a visible OUTER entity (the sky) is focusable though it is no sibling", () => {
  // Regression: the sky shows through the exterior edge chain but shares
  // neither the player's room nor the containment beneath them, so the
  // focus-clearing rule dropped it the instant it was clicked.
  expect(isFocusValid(inputs(51n))).toBe(true);
  // ...but only while the chain surfaces it: cut from the visible set
  // (an interior room), it is no longer focusable.
  expect(
    isFocusValid({ ...inputs(51n), visibleOuterEntityIds: new Set() }),
  ).toBe(false);
});

test("an unknown entity is assumed gone and loses the focus", () => {
  expect(isFocusValid(inputs(9n))).toBe(false);
});

test("an entity in another room is not focusable", () => {
  expect(isFocusValid(inputs(7n))).toBe(false);
});

// Death does NOT invalidate the focus: a corpse is a real, present,
// targetable thing (it just never auto-takes the focus). Only leaving the
// scene — losing a known location — drops it, covered above.
