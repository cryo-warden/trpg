import { createBaseline, createBaselineRecord } from "../src/Resource/Baseline";

export const baseline = createBaselineRecord([
  createBaseline("human", {
    mhp: 5,
    mep: 5,
    actionSet: new Set(["guard", "doubleStrike"]),
  }),
  createBaseline("bat", {
    mhp: 3,
    mep: 2,
    actionSet: new Set(["nibble"]),
  }),
  createBaseline("slime", {
    mhp: 2,
    mep: 1,
    actionSet: new Set(["recover", "slowSpout"]),
  }),
]);
