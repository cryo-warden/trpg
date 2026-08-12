import { EntityId } from "../trpg";

/**
 * Presentation prominence is pure client logic: the server stores no ranking.
 * Each entity's prominence derives from which components it carries, and
 * display sorts most-prominent-first with the viewer dropped. Kept
 * framework-free so both the UI and a headless driver order identically.
 *
 * This is the calm (exploration) ordering; the threat-oriented view will
 * compose hostility and threat state on top of it.
 */

export type EntityPresentation = {
  entityId: EntityId;
  hasPath: boolean;
  isPlayerControlled: boolean;
  hasHp: boolean;
};

export const prominenceOf = (presentation: EntityPresentation): number =>
  (presentation.hasPath ? 1 << 8 : 0) |
  (presentation.isPlayerControlled ? 1 << 7 : 0) |
  (presentation.hasHp ? 1 << 6 : 0);

export const sortByProminenceDescending = ({
  presentations,
  exclude,
}: {
  presentations: EntityPresentation[];
  exclude: EntityId | null;
}): EntityId[] =>
  presentations
    .filter((presentation) => presentation.entityId !== exclude)
    .toSorted((a, b) => prominenceOf(b) - prominenceOf(a))
    .map((presentation) => presentation.entityId);
