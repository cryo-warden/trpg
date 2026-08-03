import { test, expect } from "bun:test";
import {
  selectEntityProminences,
  selectLocationEntities,
  type ReadableTable,
} from "./tableSelectors";

/** An in-memory stand-in for a live SpacetimeDB table handle. */
const mockTable = <Row>(rows: Row[]): ReadableTable<Row> => ({
  iter: () => rows,
});

test("selectLocationEntities returns only the entities in the given location", () => {
  const table = mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 2n, locationEntityId: 10n },
    { entityId: 3n, locationEntityId: 20n },
  ]);
  expect(selectLocationEntities(table, 10n)).toEqual([1n, 2n]);
  expect(selectLocationEntities(table, 20n)).toEqual([3n]);
  expect(selectLocationEntities(table, 99n)).toEqual([]);
});

test("selectEntityProminences preserves request order", () => {
  const table = mockTable([
    { entityId: 1n, prominence: 3 },
    { entityId: 2n, prominence: 7 },
  ]);
  expect(selectEntityProminences(table, [2n, 1n])).toEqual([
    { entityId: 2n, prominence: 7 },
    { entityId: 1n, prominence: 3 },
  ]);
});

test("selectEntityProminences falls back to -Infinity for entities with no prominence row", () => {
  const table = mockTable([{ entityId: 1n, prominence: 3 }]);
  expect(selectEntityProminences(table, [1n, 9n])).toEqual([
    { entityId: 1n, prominence: 3 },
    { entityId: 9n, prominence: -Infinity },
  ]);
});
