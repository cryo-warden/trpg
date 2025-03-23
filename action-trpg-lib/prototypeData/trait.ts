import { createStatBlock, type StatBlock } from "../src/structures/StatBlock";
import { action } from "./action";

export const trait = {
  mobile: createStatBlock({
    actions: [action.move],
  }),
  collecting: createStatBlock({
    actions: [action.take, action.drop],
  }),
  equipping: createStatBlock({
    actions: [action.equip, action.unequip],
  }),
  small: createStatBlock({ mhp: -1 }),
  hero: createStatBlock({ mhp: 5, mep: 5 }),
  champion: createStatBlock({ mhp: 2, mep: 2 }),
} as const satisfies Record<string, StatBlock>;
