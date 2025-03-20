import type { StatBlock } from "..";

export const trait = {
  small: { mhp: -1, mep: -1, attack: 0, defense: 0 },
  hero: { mhp: 5, mep: 5, attack: 0, defense: 0 },
  champion: { mhp: 2, mep: 2, attack: 0, defense: 0 },
} as const satisfies Record<string, StatBlock>;
