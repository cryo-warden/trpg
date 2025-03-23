import { createStatBlock, type StatBlock } from "..";

export const trait = {
  small: createStatBlock({ mhp: -1, mep: -1 }),
  hero: createStatBlock({ mhp: 5, mep: 5 }),
  champion: createStatBlock({ mhp: 2, mep: 2 }),
} as const satisfies Record<string, StatBlock>;
