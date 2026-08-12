import { test, expect } from "bun:test";
import {
  selectEntityPresentations,
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

test("selectEntityPresentations derives flags from component presence in request order", () => {
  const tables = {
    paths: mockTable([{ entityId: 1n }]),
    playerControllers: mockTable([{ entityId: 2n }]),
    hps: mockTable([{ entityId: 2n }, { entityId: 3n }]),
  };
  expect(selectEntityPresentations(tables, [3n, 2n, 1n, 9n])).toEqual([
    { entityId: 3n, hasPath: false, isPlayerControlled: false, hasHp: true },
    { entityId: 2n, hasPath: false, isPlayerControlled: true, hasHp: true },
    { entityId: 1n, hasPath: true, isPlayerControlled: false, hasHp: false },
    { entityId: 9n, hasPath: false, isPlayerControlled: false, hasHp: false },
  ]);
});
