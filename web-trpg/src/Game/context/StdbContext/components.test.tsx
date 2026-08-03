import { test, expect } from "bun:test";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import type { Identity } from "spacetimedb";
import type { DbConnection } from "../../../stdb";
import { StdbContext } from "./StdbContext";
import { useLocationEntities } from "./components";

/**
 * A minimal in-memory stand-in for a live SpacetimeDB table handle: it iterates
 * its rows and lets a test drive inserts to fire the subscription the hooks
 * register. Enough of the surface for useTableData (iter + on/removeOn Insert/
 * Delete/Update).
 */
const mockTable = <Row,>(initial: Row[]) => {
  let rows = [...initial];
  const inserts = new Set<() => void>();
  const deletes = new Set<() => void>();
  const updates = new Set<() => void>();
  return {
    iter: () => rows,
    onInsert: (cb: () => void) => inserts.add(cb),
    removeOnInsert: (cb: () => void) => inserts.delete(cb),
    onDelete: (cb: () => void) => deletes.add(cb),
    removeOnDelete: (cb: () => void) => deletes.delete(cb),
    onUpdate: (cb: () => void) => updates.add(cb),
    removeOnUpdate: (cb: () => void) => updates.delete(cb),
    insertRow: (row: Row) => {
      rows = [...rows, row];
      inserts.forEach((cb) => cb());
    },
  };
};

const wrapperFor = (connection: DbConnection) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <StdbContext.Provider value={{ connection, identity: {} as Identity }}>
        {children}
      </StdbContext.Provider>
    );
  };

test("useLocationEntities returns entities in the location and updates on insert", () => {
  const table = mockTable([
    { entityId: 1n, locationEntityId: 10n },
    { entityId: 2n, locationEntityId: 20n },
  ]);
  const connection = {
    db: { location_components: table },
  } as unknown as DbConnection;

  const { result } = renderHook(() => useLocationEntities(10n), {
    wrapper: wrapperFor(connection),
  });

  expect(result.current).toEqual([1n]);

  act(() => {
    table.insertRow({ entityId: 3n, locationEntityId: 10n });
  });

  expect(result.current).toEqual([1n, 3n]);
});
