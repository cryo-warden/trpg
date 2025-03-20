import type { StatBlock } from "..";

export const baseline = {
  human: { mhp: 5, mep: 5, attack: 0, defense: 0 },
  bat: { mhp: 3, mep: 2, attack: 0, defense: 0 },
  slime: { mhp: 1, mep: 1, attack: 0, defense: 0 },
} as const satisfies Record<string, StatBlock>;
