import { ReadinessBlock, ReadinessRequirements } from "../../stdb/types";
import { addBlock } from "./statBlock";
import { IntStatRequirements, IntStats, meetsRequirements } from "./statSummary";

// Which stances exist for the player? There is NO "known stances" state: a
// stance is exactly as available as it is REACHABLE, and reachability now keys
// off READINESS (actions and stance adoption both derive from it). A stance is
// reachable when its requirements are met by an achievable readiness: the
// stance-free base, plus what carried gear could add, plus the readiness of any
// stance already reached (you adopt the next posture from the one you hold).
// A stance can add readiness that unlocks another stance, so the reachable set
// grows to a fixpoint. The server gates adoption by the same closure.

export type ReachabilityStance = {
  id: number;
  requirements: ReadinessRequirements;
  readiness: ReadinessBlock;
};

export const reachableStanceIds = ({
  baseReadiness,
  carriableReadiness,
  activeStanceId,
  stances,
}: {
  /** The stance-free base readiness (body + traits + quest). */
  baseReadiness: ReadinessBlock;
  /** Best-case readiness any carried gear could add, all summed — reachability
   * keys off everything potentially equippable, as the server does. */
  carriableReadiness: ReadinessBlock;
  activeStanceId: number | null;
  stances: readonly ReachabilityStance[];
}): number[] => {
  // The stance currently HELD is trivially reachable — even one adopted by
  // force or at creation, with no posture reaching it.
  const reached = new Set<number>(
    activeStanceId == null ? [] : [activeStanceId],
  );
  const withoutStance = addBlock(baseReadiness, carriableReadiness);
  // Each reachable context is the base+carriable readiness, optionally plus one
  // reached stance's readiness (the posture you adopt the next one from).
  const contexts = (): ReadinessBlock[] => [
    withoutStance,
    ...stances
      .filter((stance) => reached.has(stance.id))
      .map((stance) => addBlock(withoutStance, stance.readiness)),
  ];
  const meetsFrom = (requirements: ReadinessRequirements): boolean =>
    contexts().some((context) =>
      meetsRequirements(
        context as unknown as IntStats,
        requirements as unknown as IntStatRequirements,
      ),
    );

  let changed = true;
  while (changed) {
    changed = false;
    for (const stance of stances) {
      if (!reached.has(stance.id) && meetsFrom(stance.requirements)) {
        reached.add(stance.id);
        changed = true;
      }
    }
  }
  return [...reached].sort((a, b) => a - b);
};
