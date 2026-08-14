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
  /** Does this entity have a WILL of its own (an enemy controller)? A
   * corpse keeps its controller, dormant — "combatant, not scenery" — so
   * the fallen stay in the threat display where they fell. Attackable
   * scenery has hp but no will. */
  canAct: boolean;
  /** Hp exhausted. The fallen still DISPLAY as threats (their panel stays
   * put, bars visibly at zero) but never auto-take the focus. */
  isDead: boolean;
  allegianceId: EntityId | null;
};

type ThreatInputs = {
  viewer: EntityId | null;
  viewerAllegianceId: EntityId | null;
  cohabitants: Cohabitant[];
};

/** The threat DISPLAY list: hostiles alive and fallen alike, so a defeat
 * animates in place instead of reshuffling the panels mid-fight. */
export const selectHostiles = ({
  viewer,
  viewerAllegianceId,
  cohabitants,
}: ThreatInputs): EntityId[] =>
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

/** The threats that still FIGHT: the only ones eligible to be a default
 * target. A corpse stops being one the moment it falls. */
export const selectActiveHostiles = (inputs: ThreatInputs): EntityId[] => {
  const dead = new Set(
    inputs.cohabitants
      .filter((cohabitant) => cohabitant.isDead)
      .map((cohabitant) => cohabitant.entityId),
  );
  return selectHostiles(inputs).filter((entityId) => !dead.has(entityId));
};
