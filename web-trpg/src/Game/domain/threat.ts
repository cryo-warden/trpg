import { EntityId } from "../trpg";
import { isAlly } from "./actionOptions";

/**
 * Threat is a derived predicate, never a stored mode: the viewer is
 * threatened exactly when a hostile shares their location. Hostility uses
 * the same allegiance rule as attack validity (isAlly), so "what threatens
 * me" and "what I may attack" can never drift apart — but a threat must
 * also be able to ACT: a training dummy is attackable scenery, not a
 * threat. Framework-free so the UI and a headless driver agree.
 */

export type Cohabitant = {
  entityId: EntityId;
  hasHp: boolean;
  /** Can this entity act on its own (an enemy controller)? Attackable
   * scenery has hp but no will. */
  canAct: boolean;
  allegianceId: EntityId | null;
};

export const selectHostiles = ({
  viewer,
  viewerAllegianceId,
  cohabitants,
}: {
  viewer: EntityId | null;
  viewerAllegianceId: EntityId | null;
  cohabitants: Cohabitant[];
}): EntityId[] =>
  cohabitants
    .filter(
      (cohabitant) =>
        cohabitant.hasHp &&
        cohabitant.canAct &&
        !isAlly({
          playerEntity: viewer,
          target: cohabitant.entityId,
          playerAllegianceId: viewerAllegianceId,
          targetAllegianceId: cohabitant.allegianceId,
        }),
    )
    .map((cohabitant) => cohabitant.entityId);
