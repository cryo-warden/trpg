// Which stances does the stances menu show? Every stance the player could
// POSSIBLY reach: seeded by what they have now (known stances, the total
// stat block's unfiltered action grants, and the grants of every item they
// carry), then closed over two edges — an action whose effects set a stance
// reaches that stance, and a reached stance grants its own actions and
// stances. Stances can grant actions that grant stances that grant actions;
// the visited sets are the cycle prevention.

export type StanceGrants = {
  actionIds: number[];
  stanceIds: number[];
};

export type StanceReachabilityGraph = {
  /** stance id -> the action and stance grants of its stat block. */
  stanceGrants: Map<number, StanceGrants>;
  /** action id -> the stance ids its SetStance effects can adopt. */
  actionStanceTargets: Map<number, number[]>;
};

export const reachableStanceIds = ({
  seedActionIds,
  seedStanceIds,
  graph,
}: {
  seedActionIds: number[];
  seedStanceIds: number[];
  graph: StanceReachabilityGraph;
}): number[] => {
  const reachedStances = new Set<number>();
  const visitedActions = new Set<number>();
  const stanceQueue = [...seedStanceIds];
  const actionQueue = [...seedActionIds];

  while (stanceQueue.length > 0 || actionQueue.length > 0) {
    const stanceId = stanceQueue.pop();
    if (stanceId != null && !reachedStances.has(stanceId)) {
      reachedStances.add(stanceId);
      const grants = graph.stanceGrants.get(stanceId);
      if (grants != null) {
        actionQueue.push(...grants.actionIds);
        stanceQueue.push(...grants.stanceIds);
      }
    }
    const actionId = actionQueue.pop();
    if (actionId != null && !visitedActions.has(actionId)) {
      visitedActions.add(actionId);
      stanceQueue.push(...(graph.actionStanceTargets.get(actionId) ?? []));
    }
  }
  return [...reachedStances].sort((a, b) => a - b);
};
