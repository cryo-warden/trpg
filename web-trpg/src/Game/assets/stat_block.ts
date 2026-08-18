import { GearAsset, StatBlockAsset } from "../../stdb/types";

/** A sparse stat block literal over the generated wire type: anything not
 * mentioned contributes nothing. */
export const statBlock = (partial: Partial<StatBlockAsset>): StatBlockAsset => ({
  attack: 0,
  mhp: 0,
  defense: 0,
  mep: 0,
  hand: 0,
  body: 0,
  relic: 0,
  gait: 0,
  reach: 0,
  blunt: 0,
  bladed: 0,
  pole: 0,
  ward: 0,
  focus: 0,
  wing: 0,
  upright: 0,
  size: 0,
  morale: 0,
  actionNames: [],
  appearanceFeatureNames: [],
  ...partial,
});

/**
 * A piece of gear: a stat-block GRANT (the Equippable) plus the item entity's
 * OWN appearance features (its look). Two separate channels — a wielder never
 * takes on the look of the gear it holds.
 */
export const gear = (
  statBlockValue: StatBlockAsset,
  appearanceFeatureNames: string[],
): GearAsset => ({ statBlock: statBlockValue, appearanceFeatureNames });
