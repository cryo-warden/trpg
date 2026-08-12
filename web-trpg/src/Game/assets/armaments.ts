import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Armaments PROVIDE armament properties (bladed, blunt, pole, ward, focus),
// CONSUME grip (negative hand), and grant their own basic attack actions —
// whose requirements re-check the merged total like any other action. Two
// hands cannot wield what would drive hand negative in play: hand-gated
// actions (like bop) simply drop out of the derived set.
export const ARMAMENTS = {
  club: statBlock({ blunt: 1, hand: -1, actionNames: ["smash"] }),
  sword: statBlock({ bladed: 1, hand: -1, actionNames: ["slash"] }),
  staff: statBlock({
    pole: 1,
    focus: 1,
    blunt: 1,
    hand: -2,
    actionNames: ["smash"],
  }),
  shield: statBlock({
    ward: 1,
    defense: 1,
    hand: -1,
    actionNames: ["shield_bash"],
  }),
  spear: statBlock({ pole: 1, reach: 1, hand: -2, actionNames: ["thrust"] }),
  axe: statBlock({ bladed: 1, attack: 1, hand: -1, actionNames: ["cleave"] }),
  dagger: statBlock({ bladed: 1, hand: -1, actionNames: ["stab"] }),
} satisfies Record<string, StatBlockAsset>;

export type ArmamentName = keyof typeof ARMAMENTS;
