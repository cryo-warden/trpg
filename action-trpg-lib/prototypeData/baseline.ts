import { createActionRecord } from "../src/structures/Action";
import { createStatBlock, type StatBlock } from "../src/structures/StatBlock";
import { action } from "./action";

export const baseline = {
  human: createStatBlock({
    mhp: 5,
    mep: 5,
    actionRecord: createActionRecord([action.guard, action.slowStrike]),
  }),
  bat: createStatBlock({
    mhp: 3,
    mep: 2,
    actionRecord: createActionRecord([action.nibble]),
  }),
  slime: createStatBlock({
    mhp: 2,
    mep: 1,
    actionRecord: createActionRecord([action.recover, action.slowStrike]),
  }),
} as const satisfies Record<string, StatBlock>;
