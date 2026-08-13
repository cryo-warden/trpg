import { EntityId } from "../trpg";

/**
 * Which entities may hold the focus. Focus reaches: oneself, one's
 * SIBLINGS (entities sharing the room), anything UNDER oneself in the
 * location hierarchy (carried items, and their contents, recursively), and
 * the location itself (no mechanics bind to it yet, but inspecting the room
 * is legitimate). An UNKNOWN entity — no location — is assumed to have left
 * the scene and loses the focus, and the dead drop it too.
 */
export const isFocusValid = ({
  focus,
  playerEntity,
  playerLocation,
  locationOf,
  isDead,
}: {
  focus: EntityId;
  playerEntity: EntityId | null;
  playerLocation: EntityId | null;
  /** An entity's containing entity, or null when unknown. */
  locationOf: (entityId: EntityId) => EntityId | null;
  /** True when the entity has hp and it is exhausted. */
  isDead: (entityId: EntityId) => boolean;
}): boolean => {
  if (isDead(focus)) {
    return false;
  }
  if (focus === playerEntity) {
    return true;
  }
  if (playerLocation != null && focus === playerLocation) {
    return true;
  }
  const container = locationOf(focus);
  if (container == null) {
    // Unknown: assume it is no longer where we could see it.
    return false;
  }
  if (playerLocation != null && container === playerLocation) {
    return true;
  }
  // Under oneself: walk the containment chain upward looking for the
  // player. The depth cap guards against containment cycles.
  let cursor: EntityId | null = container;
  for (let depth = 0; cursor != null && depth < 16; depth++) {
    if (cursor === playerEntity) {
      return true;
    }
    cursor = locationOf(cursor);
  }
  return false;
};
