import { ReadinessRequirements } from "../../stdb/types";

/** The all-zero baseline every requirement starts from: 0 means the tag is not
 * checked (never a floor of `value >= 0`). Readiness tags are signed, so a
 * debuffed tag must not fail a requirement that never named it. Actions gate on
 * READINESS only (morale, weapon/limb/element tags, footing) — never on
 * body-capacity, stats, or size, which no longer gate what an entity can do.
 *
 * This full literal is the ONE place zeros are filled: {@link requirements}
 * spreads it under a Partial so authors name only the thresholds they mean, and
 * the wire type (plain i8 per tag) stays exact. */
export const NO_REQUIREMENTS: ReadinessRequirements = {
  morale: 0,
  bladed: 0,
  blunt: 0,
  pole: 0,
  ward: 0,
  focus: 0,
  gait: 0,
  reach: 0,
  wing: 0,
  upright: 0,
  hand: 0,
  jaw: 0,
  claw: 0,
  ooze: 0,
  fire: 0,
  ice: 0,
  lightning: 0,
  light: 0,
  shadow: 0,
  foot: 0,
  amorphous: 0,
  ethereal: 0,
};

/** Named minimum readiness thresholds; anything not mentioned stays 0 (unchecked).
 * Morale is gated EXPLICITLY per action (committed acts require morale >= 3,
 * basic/instinctive ones morale >= 1), so a feared entity loses its committed
 * actions first, then all but rally once morale hits 0. `hand` here is the
 * FREE-hand readiness (unarmed strikes need a free hand), distinct from the
 * body-capacity hand that only decides whether gear fits. A spell names both
 * `focus` and its element. */
export const requirements = (
  partial: Partial<ReadinessRequirements>,
): ReadinessRequirements => ({
  ...NO_REQUIREMENTS,
  ...partial,
});
