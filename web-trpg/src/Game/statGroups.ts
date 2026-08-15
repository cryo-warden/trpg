import type { StatBlock } from "../stdb/types";

/**
 * The categorized DETAILED stats view: one vocabulary for every card
 * that lays a full stat block out — stance cards and the equip menu
 * alike, so the two read as the same kind of surface.
 */

/** Every int stat of the block (the id-vec grants are not numbers). */
export type IntStatKey = Exclude<
  keyof StatBlock,
  "actionIds" | "appearanceFeatureIds"
>;

export type StatEntry = readonly [IntStatKey, string];

export type StatGroup = { label: string; stats: readonly StatEntry[] };

export const STAT_GROUPS: readonly StatGroup[] = [
  {
    label: "Combat",
    stats: [
      ["attack", "Attack"],
      ["defense", "Defense"],
      ["morale", "Morale"],
    ],
  },
  {
    label: "Pools",
    stats: [
      ["mhp", "Max HP"],
      ["mep", "Max EP"],
    ],
  },
  {
    label: "Body",
    stats: [
      ["hand", "Hand"],
      ["gait", "Gait"],
      ["reach", "Reach"],
      ["wing", "Wing"],
      ["upright", "Upright"],
      ["size", "Size"],
    ],
  },
  {
    label: "Armament",
    stats: [
      ["blunt", "Blunt"],
      ["bladed", "Bladed"],
      ["pole", "Pole"],
      ["ward", "Ward"],
      ["focus", "Focus"],
    ],
  },
];

export const ALL_STATS: readonly StatEntry[] = STAT_GROUPS.flatMap(
  (group) => group.stats,
);

export const deltaText = (delta: number): string =>
  delta > 0 ? `+${delta}` : `${delta}`;

/** "1 (-1)" with a real delta; plain "0" when nothing moved — no view
 * shows "(0)". A zero-delta parenthetical is noise, and the equip menu
 * (delta 0 everywhere, being the base stances compare to) shows none. */
export const statWithDelta = (value: number, delta: number): string =>
  delta === 0 ? `${value}` : `${value} (${deltaText(delta)})`;
