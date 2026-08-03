import { test, expect } from "bun:test";
import { sortByProminenceDescending } from "./prominence";

const prominences = [
  { entityId: 1n, prominence: 5 },
  { entityId: 2n, prominence: 10 },
  { entityId: 3n, prominence: 1 },
];

test("sorts by prominence descending and drops the excluded entity", () => {
  expect(sortByProminenceDescending({ prominences, exclude: 2n })).toEqual([1n, 3n]);
});

test("keeps every entity when nothing is excluded", () => {
  expect(sortByProminenceDescending({ prominences, exclude: null })).toEqual([
    2n,
    1n,
    3n,
  ]);
});

test("returns an empty list for no prominences", () => {
  expect(sortByProminenceDescending({ prominences: [], exclude: null })).toEqual(
    [],
  );
});
