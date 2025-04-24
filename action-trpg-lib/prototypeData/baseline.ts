import { createActionRecord } from "../src/structures/Action";
import {
  createBaseline,
  createBaselineRecord,
} from "../src/structures/StatBlock";
import { action } from "./action";

export const baseline = createBaselineRecord([
  createBaseline("human", {
    mhp: 5,
    mep: 5,
    actionRecord: createActionRecord([action.guard, action.doubleStrike]),
  }),
  createBaseline("bat", {
    mhp: 3,
    mep: 2,
    actionRecord: createActionRecord([action.nibble]),
  }),
  createBaseline("slime", {
    mhp: 2,
    mep: 1,
    actionRecord: createActionRecord([action.recover, action.slowSpout]),
  }),
]);
