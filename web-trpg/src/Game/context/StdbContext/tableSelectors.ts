import { EntityId } from "../../trpg";
import { EntityProminence } from "../../domain/prominence";

/**
 * The minimal read surface the client needs from a database table: iterate its
 * rows. Both the live SpacetimeDB table handle (`connection.db[table]`) and the
 * in-memory test mock satisfy it structurally, so the selectors below — and any
 * headless/CLI driver — depend on this interface rather than on the generated
 * `DbConnection`. This is the dependency-injection seam that lets table-derived
 * logic be unit-tested with a mock instead of a real stdb connection.
 *
 * Selectors are typed against the minimal row shape they read, so a live table
 * (whose rows carry more columns) and a hand-built mock row both satisfy them.
 */
export interface ReadableTable<Row> {
  iter: () => Iterable<Row>;
}

/** A unique index over a table, keyed by one column (e.g. `entityId`/`identity`). */
export interface UniqueIndex<Key, Row> {
  find: (key: Key) => Row | undefined;
}

/** The ids of the entities located directly in a given location. */
export const selectLocationEntities = (
  table: ReadableTable<{ entityId: EntityId; locationEntityId: EntityId }>,
  locationEntityId: EntityId | null,
): EntityId[] =>
  [...table.iter()]
    .filter((component) => component.locationEntityId === locationEntityId)
    .map((component) => component.entityId);

/**
 * Prominences for the requested entities, in the requested order. Entities with
 * no prominence row fall back to `-Infinity` so they sort last.
 */
export const selectEntityProminences = (
  table: ReadableTable<EntityProminence>,
  entityIds: EntityId[],
): EntityProminence[] => {
  const byId = new Map(
    [...table.iter()].map((prominence) => [prominence.entityId, prominence]),
  );
  return entityIds.map(
    (entityId) => byId.get(entityId) ?? { entityId, prominence: -Infinity },
  );
};
