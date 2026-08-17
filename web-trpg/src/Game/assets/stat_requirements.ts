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
  upright: undefined,
  size: undefined,
  morale: undefined,
  mhp: undefined,
  mep: undefined,
};

/** Named minimum thresholds; anything not mentioned stays unchecked. Morale
 * is gated EXPLICITLY per action, never by default: committed/brave acts
 * (weapon strikes, spells, heavies) require morale >= 3, basic/instinctive/
 * defensive ones (bop, bite, guard, dive, move) require morale >= 1, and the
 * rest stay morale-free. The fear status sinks morale (courage lifts it), so
 * a feared entity loses its committed actions first, then everything but
 * rally once morale hits 0. */
export const requirements = (
  partial: Partial<StatRequirements>,
): StatRequirements => ({
  ...NO_REQUIREMENTS,
  ...partial,
});
