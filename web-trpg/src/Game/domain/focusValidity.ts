import { EntityId } from "../trpg";

/**
 * Which entities may hold the focus. Focus reaches: oneself, one's
 * SIBLINGS (entities sharing the room), anything UNDER oneself in the
 * location hierarchy (carried items, and their contents, recursively), the
 * location itself (no mechanics bind to it yet, but inspecting the room is
 * legitimate), and the OUTER entities seen through the exterior edge chain
 * (the sky over an outdoor room and its kin) — anything the room renders
 * is inspectable, or it could never be un-focused after landing on it. An
 * UNKNOWN entity — no location — is assumed to have left the scene and
 * loses the focus. The DEAD keep it: a corpse is a real, present,
 * targetable thing — it just never auto-takes the focus.
 */
export const isFocusValid = ({
  focus,
  playerEntity,
  playerLocation,
  visibleOuterEntityIds,
  locationOf,
}: {
  focus: EntityId;
  playerEntity: EntityId | null;
  playerLocation: EntityId | null;
  /** Entities visible beyond the room through the exterior edge chain —
   * the sky and its kin. Inspectable exactly because they are shown. */
  visibleOuterEntityIds: ReadonlySet<EntityId>;
  /** An entity's containing entity, or null when unknown. */
  locationOf: (entityId: EntityId) => EntityId | null;
}): boolean => {
  if (focus === playerEntity) {
    return true;
  }
  if (playerLocation != null && focus === playerLocation) {
    return true;
  }
  if (visibleOuterEntityIds.has(focus)) {
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
