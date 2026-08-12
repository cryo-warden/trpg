import { StanceAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";
import { NO_REQUIREMENTS, requirements } from "./stat_requirements";

// A stance's stat block is an ordinary contribution to the entity's total —
// including its actionNames, the stance's granted techniques (at most 6;
// enforced at push). Its requirements gate ADOPTING the stance and are
// checked against the entity's stance-free base.
export const STANCES = {
  brawler: {
    requirements: requirements({ hand: 1 }),
    statBlock: statBlock({}),
  },
  amorphous: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({}),
  },
  // Knocked down: harder to fight from, and gait sinks below what movement
  // actions require, so they drop out of the derived available actions.
  prone: {
    requirements: NO_REQUIREMENTS,
    statBlock: statBlock({ attack: -1, defense: -1, gait: -2 }),
  },
} satisfies Record<string, StanceAsset>;

export type StanceName = keyof typeof STANCES;
