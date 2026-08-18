import { StatBlockAsset } from "../../stdb/types";

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
