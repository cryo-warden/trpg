import {
  BodyCapacityBlock,
  ReadinessBlock,
  StatsBlock,
} from "../../stdb/types";
import { EntityId } from "../trpg";
import { IntStats } from "./statSummary";

/**
 * Client-side PER-GROUP stat arithmetic: the mirror of the server's per-group
 * `AddAssign`/`negated` and its body-capacity apply-if-fits loop. The menus use
 * it to render the HYPOTHETICAL totals a CONFIGURATION would produce — updated
 * the instant a selection changes — rather than reading the actual equipment,
 * which only converges when the player completes a later action.
 *
 * The four groups are INDEPENDENT: there is no merged/flat block. `GroupedBlock`
 * is only a BUNDLE of the three numeric groups a configuration moves together
 * (appearance is the item's own look, carried separately), each field group
 * operated on by the same generic record arithmetic.
 */

/** The equipment CAPACITIES an item may consume: grip and the worn slots. Only
 * body-capacity gates whether gear fits. */
export const CAPACITY_KEYS = ["hand", "body", "relic"] as const;

/** All-zero per-group identities: the addition identity and the stand-in for an
 * absent per-source cache row. */
export const ZERO_STATS: StatsBlock = {
  mhp: 0,
  mep: 0,
  attack: 0,
  defense: 0,
  size: 0,
};
export const ZERO_BODY_CAPACITY: BodyCapacityBlock = {
  hand: 0,
  body: 0,
  relic: 0,
};
export const ZERO_READINESS: ReadinessBlock = {
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

/** Generic field-wise record addition: every field of `b` summed onto `a`. One
 * operation for each numeric group (stats, body-capacity, readiness) — they all
 * satisfy `Record<string, number>`. */
export const addBlock = <T extends Record<string, number>>(a: T, b: T): T => {
  const out: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    out[key] = (out[key] ?? 0) + value;
  }
  return out as T;
};

/** a − b, field-wise: the inverse of {@link addBlock}, used to PEEL a source
 * (equipment, status, the active stance) back off a published total. */
export const subtractBlock = <T extends Record<string, number>>(
  a: T,
  b: T,
): T => {
  const out: Record<string, number> = { ...a };
  for (const [key, value] of Object.entries(b)) {
    out[key] = (out[key] ?? 0) - value;
  }
  return out as T;
};

/** The three numeric groups a configuration moves together — a bundle of
 * INDEPENDENT blocks, never a merged one. */
export type GroupedBlock = {
  stats: StatsBlock;
  bodyCapacity: BodyCapacityBlock;
  readiness: ReadinessBlock;
};

export const ZERO_GROUPED: GroupedBlock = {
  stats: ZERO_STATS,
  bodyCapacity: ZERO_BODY_CAPACITY,
  readiness: ZERO_READINESS,
};

/** Flatten a grouped bundle to one int-stat record for DISPLAY only (summaries,
 * the categorized stat view). The two `hand` stats collapse to the BODY-CAPACITY
 * one — free grip is what these surfaces show; readiness-hand matters for action
 * gating, not the summary line. */
export const flattenGrouped = (block: GroupedBlock): IntStats => ({
  ...block.readiness,
  ...block.stats,
  ...block.bodyCapacity,
});

/** Add two grouped bundles by adding each group independently. */
export const addGrouped = (a: GroupedBlock, b: GroupedBlock): GroupedBlock => ({
  stats: addBlock(a.stats, b.stats),
  bodyCapacity: addBlock(a.bodyCapacity, b.bodyCapacity),
  readiness: addBlock(a.readiness, b.readiness),
});

/** a − b across each group independently. */
export const subtractGrouped = (
  a: GroupedBlock,
  b: GroupedBlock,
): GroupedBlock => ({
  stats: subtractBlock(a.stats, b.stats),
  bodyCapacity: subtractBlock(a.bodyCapacity, b.bodyCapacity),
  readiness: subtractBlock(a.readiness, b.readiness),
});

/**
 * Does the running body-capacity ADMIT this item — every capacity the item
 * CONSUMES staying non-negative once applied? A grant (>= 0) never blocks.
 * Exactly the server's per-item causation rule
 * (BodyCapacityBlock::admits_equipment_item). Only body-capacity gates fit.
 */
export const admitsEquipmentItem = (
  running: BodyCapacityBlock,
  item: BodyCapacityBlock,
): boolean =>
  CAPACITY_KEYS.every((key) => item[key] >= 0 || running[key] + item[key] >= 0);

export type EquipCandidate = { entityId: EntityId; block: GroupedBlock };

/**
 * Fold candidate items onto a base in order, applying each only while it fits
 * (apply-if-fits; the first item to overrun a body-capacity it consumes is
 * skipped, later items still considered) — the client mirror of the server's
 * equipment compute loop. Fit is decided by body-capacity alone; a fitting item
 * contributes ALL its groups. Returns the resulting grouped total and the entity
 * ids whose stats did NOT apply.
 */
export const applyEquipmentIfFits = (
  base: GroupedBlock,
  candidates: readonly EquipCandidate[],
): { total: GroupedBlock; unappliedEntityIds: EntityId[] } => {
  let total = base;
  const unappliedEntityIds: EntityId[] = [];
  for (const { entityId, block } of candidates) {
    if (admitsEquipmentItem(total.bodyCapacity, block.bodyCapacity)) {
      total = addGrouped(total, block);
    } else {
      unappliedEntityIds.push(entityId);
    }
  }
  return { total, unappliedEntityIds };
};
