import { GearAsset } from "../../stdb/types";
import { gear, statBlock } from "./stat_block";

// Armaments PROVIDE armament properties (bladed, blunt, pole, ward, focus),
// CONSUME grip (negative hand), and grant their own basic attack actions —
// whose requirements re-check the merged total like any other action. Two
// hands cannot wield what would drive hand negative in play: hand-gated
// actions (like bop) simply drop out of the derived set.
export const ARMAMENTS = {
  club: gear(statBlock({ blunt: 1, hand: -1, morale: 1, actionNames: ["smash"] }), ["club"]),
  // A blade or an axe in hand steadies the nerves: morale is a stat, so a
  // wielded weapon's contribution can itself overcome a fear.
  sword: gear(statBlock({ bladed: 1, hand: -1, morale: 1, actionNames: ["slash"] }), ["sword"]),
  staff: gear(
    statBlock({ pole: 1, focus: 1, blunt: 1, hand: -2, morale: 1, actionNames: ["smash"] }),
    ["staff"],
  ),
  // A shield at the ready steadies the nerve more than a blade: it is the
  // posture of standing your ground.
  shield: gear(
    statBlock({ ward: 1, defense: 1, hand: -1, morale: 2, actionNames: ["shield_bash"] }),
    ["shield"],
  ),
  spear: gear(
    statBlock({ pole: 1, reach: 1, hand: -2, morale: 1, actionNames: ["thrust"] }),
    ["spear"],
  ),
  axe: gear(
    statBlock({ bladed: 1, attack: 1, hand: -1, morale: 1, actionNames: ["cleave"] }),
    ["axe"],
  ),
  dagger: gear(statBlock({ bladed: 1, hand: -1, morale: 1, actionNames: ["stab"] }), ["dagger"]),
} satisfies Record<string, GearAsset>;

export type ArmamentName = keyof typeof ARMAMENTS;

/** What a person reads on an armament button — the ACTION_APPEARANCES
 * seam for gear. The Record over ArmamentName makes a missing entry a
 * compile error. */
export const ARMAMENT_DISPLAY_NAMES: Record<ArmamentName, string> = {
  club: "Club",
  sword: "Sword",
  staff: "Staff",
  shield: "Shield",
  spear: "Spear",
  axe: "Axe",
  dagger: "Dagger",
};
