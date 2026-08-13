import { test, expect } from "bun:test";
import {
  reachableStanceIds,
  StanceReachabilityGraph,
} from "./stanceReachability";

// Stances 1 and 2 form a cycle through actions 10 and 20; stance 3 hangs
// off stance 2 via action 30; stance 9 is unreachable.
const graph: StanceReachabilityGraph = {
  stanceGrants: new Map([
    [1, { actionIds: [10] }],
    [2, { actionIds: [20, 30] }],
    [3, { actionIds: [] }],
    [9, { actionIds: [] }],
  ]),
  actionStanceTargets: new Map([
    [10, [2]],
    [20, [1]],
    [30, [3]],
  ]),
};

test("closes over action->stance and stance->action edges", () => {
  expect(
    reachableStanceIds({ seedActionIds: [], seedStanceIds: [1], graph }),
  ).toEqual([1, 2, 3]);
});

test("terminates on cycles and excludes the unreachable", () => {
  const reached = reachableStanceIds({
    seedActionIds: [10],
    seedStanceIds: [],
    graph,
  });
  expect(reached).toEqual([1, 2, 3]);
  expect(reached).not.toContain(9);
});

test("a seed action with no stance targets reaches nothing", () => {
  expect(
    reachableStanceIds({ seedActionIds: [99], seedStanceIds: [], graph }),
  ).toEqual([]);
});
