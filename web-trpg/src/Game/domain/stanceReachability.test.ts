import { test, expect } from "bun:test";
import type { ReadinessBlock } from "../../stdb/types";
import { requirements } from "../assets/stat_requirements";
import { ZERO_READINESS } from "./statBlock";
import { reachableStanceIds, ReachabilityStance } from "./stanceReachability";

// Reachability now keys off READINESS: a stance is reachable when its
// requirements are met by the stance-free base, plus what carried gear could
// add, plus the readiness of any already-reached stance (you adopt the next
// posture from the one you hold). A stance's granted readiness can unlock the
// next, so the reachable set grows to a fixpoint.

const readiness = (partial: Partial<ReadinessBlock>): ReadinessBlock => ({
  ...ZERO_READINESS,
  ...partial,
});
const stance = (
  id: number,
  reqs: Parameters<typeof requirements>[0],
  grant: Partial<ReadinessBlock>,
): ReachabilityStance => ({
  id,
  requirements: requirements(reqs),
  readiness: readiness(grant),
});

// A chain: s1 needs nothing and grants focus; s2 needs focus and grants fire;
// s3 needs fire. s9 needs shadow, which nothing grants — so it stays out.
const s1 = stance(1, {}, { focus: 1 });
const s2 = stance(2, { focus: 1 }, { fire: 1 });
const s3 = stance(3, { fire: 1 }, {});
const s9 = stance(9, { shadow: 5 }, {});
const base = readiness({ morale: 5, upright: 2 });
const none = ZERO_READINESS;

test("closes over the chain of stance-granted readiness", () => {
  expect(
    reachableStanceIds({
      baseReadiness: base,
      carriableReadiness: none,
      activeStanceId: null,
      stances: [s1, s2, s3, s9],
    }),
  ).toEqual([1, 2, 3]);
});

test("the held stance is reachable even when its requirements are unmet", () => {
  const reached = reachableStanceIds({
    baseReadiness: base,
    carriableReadiness: none,
    activeStanceId: 9,
    stances: [s1, s9],
  });
  expect(reached).toEqual([1, 9]);
});

test("carried gear's readiness can unlock a stance the base cannot", () => {
  const dueling = stance(2, { bladed: 1 }, {});
  expect(
    reachableStanceIds({
      baseReadiness: base,
      carriableReadiness: none,
      activeStanceId: null,
      stances: [dueling],
    }),
  ).toEqual([]);
  expect(
    reachableStanceIds({
      baseReadiness: base,
      carriableReadiness: readiness({ bladed: 1 }),
      activeStanceId: null,
      stances: [dueling],
    }),
  ).toEqual([2]);
});
