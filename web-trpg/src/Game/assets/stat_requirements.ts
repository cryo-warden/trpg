import { StatRequirements } from "../../stdb/types";

/** No stat checked: the absent-means-unchecked baseline every requirement
 * starts from. Stats are signed, so "unchecked" is never inferred from a
 * zero — a threshold exists only when named. */
export const NO_REQUIREMENTS: StatRequirements = {
  attack: undefined,
  defense: undefined,
  hand: undefined,
  gait: undefined,
  reach: undefined,
  blunt: undefined,
  bladed: undefined,
  pole: undefined,
  ward: undefined,
  focus: undefined,
  wing: undefined,
  size: undefined,
  morale: undefined,
  mhp: undefined,
  mep: undefined,
};

/** Named minimum thresholds; anything not mentioned stays unchecked. */
export const requirements = (
  partial: Partial<StatRequirements>,
): StatRequirements => ({
  ...NO_REQUIREMENTS,
  ...partial,
});
