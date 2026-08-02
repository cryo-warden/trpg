import { EntityId } from "../trpg";

/**
 * Ordering entities for display by prominence is pure client logic: given each
 * entity's prominence, drop the viewer and sort the rest most-prominent-first.
 * Kept framework-free so both the UI and a headless driver order identically.
 */

export type EntityProminence = { entityId: EntityId; prominence: number };

export const sortByProminenceDescending = ({
  prominences,
  exclude,
}: {
  prominences: EntityProminence[];
  exclude: EntityId | null;
}): EntityId[] =>
  prominences
    .filter((ep) => ep.entityId !== exclude)
    .toSorted((a, b) => b.prominence - a.prominence)
    .map((ep) => ep.entityId);
