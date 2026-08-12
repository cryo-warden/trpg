import { test, expect } from "bun:test";
import { prominenceOf, sortByProminenceDescending } from "./prominence";

const presentation = (
  entityId: bigint,
  flags: Partial<{ hasPath: boolean; isPlayerControlled: boolean; hasHp: boolean }> = {},
) => ({
  entityId,
  hasPath: false,
  isPlayerControlled: false,
  hasHp: false,
  ...flags,
});

const presentations = [
  presentation(1n, { isPlayerControlled: true }), // middle
  presentation(2n, { hasPath: true }), // highest
  presentation(3n, { hasHp: true }), // lowest ranked flag
  presentation(4n), // no flags at all
];

test("ranks paths above players above hp-bearers above the unremarkable", () => {
  expect(prominenceOf(presentation(2n, { hasPath: true }))).toBeGreaterThan(
    prominenceOf(presentation(1n, { isPlayerControlled: true })),
  );
  expect(
    prominenceOf(presentation(1n, { isPlayerControlled: true })),
  ).toBeGreaterThan(prominenceOf(presentation(3n, { hasHp: true })));
  expect(prominenceOf(presentation(3n, { hasHp: true }))).toBeGreaterThan(
    prominenceOf(presentation(4n)),
  );
});

test("sorts by prominence descending and drops the excluded entity", () => {
  expect(
    sortByProminenceDescending({ presentations, exclude: 2n }),
  ).toEqual([1n, 3n, 4n]);
});

test("keeps every entity when nothing is excluded", () => {
  expect(
    sortByProminenceDescending({ presentations, exclude: null }),
  ).toEqual([2n, 1n, 3n, 4n]);
});

test("returns an empty list for no presentations", () => {
  expect(
    sortByProminenceDescending({ presentations: [], exclude: null }),
  ).toEqual([]);
});
