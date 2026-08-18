import { StatBlock } from "../../stdb/types";
import { EntityId } from "../trpg";

/**
 * Client-side StatBlock arithmetic: the mirror of the server's StatBlock
 * `AddAssign` and its equipment apply-if-fits loop. The menus use it to render
 * the HYPOTHETICAL totals a CONFIGURATION would produce — updated the instant a
 * selection changes — rather than reading the actual equipment, which only
 * converges when the player completes a later action.
 */

/** The equipment CAPACITIES an item may consume: grip and the worn slots. */
export const CAPACITY_KEYS = ["hand", "body", "relic"] as const;

/** A fresh all-zero block, the identity for addition and the stand-in for an
 * absent per-source cache row. */
export const ZERO_STAT_BLOCK: StatBlock = {
  attack: 0,
  defense: 0,
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
  mhp: 0,
  mep: 0,
  actionIds: [],
  appearanceFeatureIds: [],
};

const isNumber = (value: unknown): value is number => typeof value === "number";

/**
 * Generalized record addition: every NUMERIC field summed, every ARRAY field
 * unioned (deduped, order-preserving). Generic over the record shape so it
 * survives new stat fields without edits here.
 */
export const addStatBlocks = (a: StatBlock, b: StatBlock): StatBlock => {
  const out: Record<string, unknown> = { ...a };
  for (const [key, bv] of Object.entries(b)) {
    const av = (a as Record<string, unknown>)[key];
    // Key off b's field kind and default a's — so a sparse block (a test
    // total that omits fields) is normalized to a full one, never crashing on
    // a missing array.
    if (isNumber(bv)) {
      out[key] = (isNumber(av) ? av : 0) + bv;
    } else if (Array.isArray(bv)) {
      out[key] = [...new Set([...(Array.isArray(av) ? av : []), ...bv])];
    }
  }
  return out as StatBlock;
};

/**
 * a − b: numeric fields differenced, array fields set-differenced (a minus b).
 * The inverse of addition, used to PEEL a source (equipment, status, the
 * active stance) back off the published total to recover a steady base.
 */
export const subtractStatBlocks = (a: StatBlock, b: StatBlock): StatBlock => {
  const out: Record<string, unknown> = { ...a };
  for (const [key, bv] of Object.entries(b)) {
    const av = (a as Record<string, unknown>)[key];
    // Key off b's field kind and default a's, so subtracting a full ZERO
    // block normalizes a sparse input to a full block.
    if (isNumber(bv)) {
      out[key] = (isNumber(av) ? av : 0) - bv;
    } else if (Array.isArray(bv)) {
      const remove = new Set(bv);
      out[key] = (Array.isArray(av) ? av : []).filter((x) => !remove.has(x));
    }
  }
  return out as StatBlock;
};

/**
 * Does the running total ADMIT this item — every capacity the item CONSUMES
 * staying non-negative once applied? A grant (>= 0) never blocks. Exactly the
 * server's per-item causation rule (StatBlock::admits_equipment_item).
 */
export const admitsEquipmentItem = (
  running: StatBlock,
  item: StatBlock,
): boolean =>
  CAPACITY_KEYS.every((key) => item[key] >= 0 || running[key] + item[key] >= 0);

export type EquipCandidate = { entityId: EntityId; block: StatBlock };

/**
 * Fold candidate items onto a base in order, applying each only while it fits
 * (apply-if-fits; the first item to overrun a capacity it consumes is skipped,
 * later items still considered) — the client mirror of the server's equipment
 * compute loop. Returns the resulting total and the entity ids whose stats did
 * NOT apply.
 */
export const applyEquipmentIfFits = (
  base: StatBlock,
  candidates: readonly EquipCandidate[],
): { total: StatBlock; unappliedEntityIds: EntityId[] } => {
  let total = base;
  const unappliedEntityIds: EntityId[] = [];
  for (const { entityId, block } of candidates) {
    if (admitsEquipmentItem(total, block)) {
      total = addStatBlocks(total, block);
    } else {
      unappliedEntityIds.push(entityId);
    }
  }
  return { total, unappliedEntityIds };
};
