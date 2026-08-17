/**
 * THE stat-block summary: the non-zero elements of a stat block, in one
 * canonical order. Pure and shared by every surface that summarizes a
 * block — event narration, an item's entity-card line, stance cards, the
 * customization menu — so no surface hand-rolls its own stat formatting.
 */

/** Every int stat a block carries, in display order. The id vecs
 * (actions, appearance features) are not stats and never summarize. */
export const STAT_KEYS = [
  "mhp",
  "mep",
  "attack",
  "defense",
  "hand",
  "gait",
  "reach",
  "blunt",
  "bladed",
  "pole",
  "ward",
  "focus",
  "wing",
  "upright",
  "size",
  "morale",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** Any object carrying the int stats — StatBlock rows, stat-block assets,
 * and event payloads all satisfy this. Partial on purpose: an absent key
 * reads as zero, so summaries stay total functions over loose inputs. */
export type IntStats = Partial<Record<StatKey, number>>;

export const nonZeroStats = (
  block: IntStats,
): { key: StatKey; value: number }[] =>
  STAT_KEYS.flatMap((key) => {
    const value = block[key] ?? 0;
    return value !== 0 ? [{ key, value }] : [];
  });

/** DELTAS: every value signed ("+2 mhp, -1 gait"). For contributions and
 * event payloads — what an act changed. */
export const signedStatSummary = (block: IntStats): string =>
  nonZeroStats(block)
    .map(({ key, value }) => `${value > 0 ? "+" : ""}${value} ${key}`)
    .join(", ");

/** TOTALS: plain values ("mhp 12, gait 2"). For absolute states like the
 * player's total stat block, where a sign would misread as a delta. */
export const totalStatSummary = (block: IntStats): string =>
  nonZeroStats(block)
    .map(({ key, value }) => `${key} ${value}`)
    .join(", ");

/** Explicitly named minimum thresholds over the int stats — the client
 * mirror of the server's StatRequirements semantics: an absent entry
 * means "this stat is not checked", never inferred from zero. */
export type IntStatRequirements = Partial<Record<StatKey, number | undefined>>;

/** Does the actor's stat context meet every NAMED threshold? Mirrors the
 * server's act-time gate so offered and derived options never show an
 * action the server would refuse (null stats read as all-zero). */
export const meetsRequirements = (
  stats: IntStats | null,
  requirements: IntStatRequirements,
): boolean =>
  STAT_KEYS.every((key) => {
    const threshold = requirements[key];
    return threshold == null || (stats?.[key] ?? 0) >= threshold;
  });

/** Sum blocks into one plain int-stat record (id vecs ignored): the
 * combined contribution of a gear set. */
export const summedStats = (blocks: readonly IntStats[]): IntStats => {
  const total = Object.fromEntries(STAT_KEYS.map((key) => [key, 0])) as Record<
    StatKey,
    number
  >;
  for (const block of blocks) {
    for (const key of STAT_KEYS) {
      total[key] += block[key] ?? 0;
    }
  }
  return total;
};
