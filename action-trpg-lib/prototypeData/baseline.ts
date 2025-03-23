import { createStatBlock, type StatBlock } from "../src/structures/StatBlock";
import { action } from "./action";

export const baseline = {
  human: createStatBlock({
    mhp: 5,
    mep: 5,
    actions: [
      action.move,
      action.take,
      action.drop,
      action.equip,
      action.unequip,
      action.guard,
      action.slowStrike,
    ],
  }),
  bat: createStatBlock({
    mhp: 3,
    mep: 2,
    actions: [
      action.move,
      action.take,
      action.drop,
      action.equip,
      action.unequip,
    ],
  }),
  slime: createStatBlock({
    mhp: 1,
    mep: 1,
    actions: [action.recover, action.slowStrike],
  }),
} as const satisfies Record<string, StatBlock>;
