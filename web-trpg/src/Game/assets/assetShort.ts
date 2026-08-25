import { EntityBlobAsset } from "../../stdb/types";

// The ergonomic authoring layer over EntityBlobAsset. The bare `blob()` cast
// (see entity_blobs.ts) does nothing: no name-typed cross-refs, no defaults, no
// validation. The shorthand builders (creature, gear, …) sit on the pieces
// here — a name-typed short in, a full blob out — so a mistyped baseline or a
// half-filled component fails at author time instead of shipping a broken
// entity. The generated wire types stay exact; this only shapes how we WRITE
// them.

/** A recursive Partial. Every field is optional at every depth, so an escape
 * hatch can override ONE inner field of ONE component without restating the
 * whole component. Arrays are values, not structures: an override array
 * REPLACES the base array wholesale — there is no element-wise merge. */
export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

/** One field of an entity blob made shallowly optional: author a SUBSET of a
 * component's inner fields without restating the whole component. A name-list
 * field (string / string[]) keeps its own type — there is nothing to make
 * partial; only object components become {@link Partial}. */
type ComponentShort<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? Partial<T>
    : T;

/** The escape hatch's shape: the generated EntityBlob with every component made
 * Partial. A shorthand's trailing options object carries one under
 * `componentMap`; it is deep-merged over the blob the shorthand built, for the
 * one-off field no shorthand covers (a fixed allegiance, a placed location). DI,
 * not a flag — the shorthand decides the base; the componentMap only overrides
 * it. */
export type EntityBlobShort = {
  [K in keyof EntityBlobAsset]?: ComponentShort<NonNullable<EntityBlobAsset[K]>>;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Overlay `override` onto `base` field by field: recurse into plain objects,
 * replace everything else (primitives, arrays, enum sum values) wholesale. An
 * `undefined` override leaves the base field untouched. Swapping one enum sum
 * VARIANT for another should restate the whole variant — a partial variant
 * would leave the old variant's payload fields stranded. */
export const deepMerge = <T>(base: T, override: DeepPartial<T> | undefined): T => {
  if (override === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override as unknown as T;
  }
  const merged: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    merged[key] = deepMerge(merged[key], value as never);
  }
  return merged as T;
};

/** Apply a short's `componentMap` escape hatch over the base blob it built. */
export const applyComponentMap = (
  base: EntityBlobAsset,
  componentMap: EntityBlobShort | undefined,
  // Pin the generic to the base type: otherwise TS infers it from the
  // all-optional override and the result widens to DeepPartial.
): EntityBlobAsset => deepMerge<EntityBlobAsset>(base, componentMap);

/** Hydrate a NAMED table of shorthands in ONE pass. Each row is a tuple
 * `[name, ...shorthandArgs]` — a tuple-matrix pseudo-table — and every row runs
 * through the same `build` conversion. We never call a shorthand builder per
 * asset; we map it over the table. `name` stays a literal, so the result's keys
 * feed `keyof`-derived name unions downstream. (A future data-file source would
 * feed the same rows through zod validation before reaching here.) */
export const namedBlobTable = <A extends unknown[], const N extends string>(
  build: (...args: A) => EntityBlobAsset,
  rows: readonly (readonly [name: N, ...args: A])[],
): Record<N, EntityBlobAsset> =>
  Object.fromEntries(
    rows.map(([name, ...args]) => [name, build(...(args as unknown as A))]),
  ) as Record<N, EntityBlobAsset>;

/** For each component that carries required inner fields, the fields that MUST
 * be present when the component is authored at all. A component absent entirely
 * is fine (it simply does not apply); a PRESENT component missing one of these
 * is a malformed blob — almost always a half-filled escape-hatch override.
 * Components with no required fields (e.g. `enemyController: {}`) are omitted
 * here on purpose: their mere presence is the whole signal. */
export const COMPONENT_REQUIRED_FIELDS = {
  name: ["name"],
  location: ["locationEntityId", "kind"],
  allegiance: ["allegianceEntityId"],
  item: ["tag"],
  equippable: ["stats", "appearance", "bodyCapacity", "readiness"],
  hp: ["hp", "mhp", "defense", "accumulatedDamage", "accumulatedHealing"],
  differentiable: ["traitPaletteName"],
  checkpoint: ["locationMapName", "checkpointIndex"],
  checkpointBinding: ["locationMapName", "checkpointIndex"],
} as const satisfies Partial<Record<keyof EntityBlobAsset, readonly string[]>>;

/** Throw if any PRESENT component on the blob misses a required inner field.
 * Runs where the asset NAME is known (see {@link blobPairs}), so the message
 * names the offending asset — a typo'd escape hatch fails loudly at push time
 * rather than silently shipping. */
export const validateBlob = (name: string, blob: EntityBlobAsset): void => {
  for (const [component, required] of Object.entries(COMPONENT_REQUIRED_FIELDS)) {
    const value = (blob as Record<string, unknown>)[component];
    if (value == null) continue;
    if (!isPlainObject(value)) {
      throw new Error(
        `Asset "${name}": component "${component}" must be an object, got ${typeof value}`,
      );
    }
    const missing = required.filter((field) => value[field] === undefined);
    if (missing.length > 0) {
      throw new Error(
        `Asset "${name}": component "${component}" is missing required field(s): ${missing.join(", ")}`,
      );
    }
  }
};

/** Validate a single standalone blob (e.g. the new-player blob, which has no
 * record key of its own) and return it, so it can be dropped straight into the
 * asset pack. */
export const validatedBlob = (
  name: string,
  blob: EntityBlobAsset,
): EntityBlobAsset => {
  validateBlob(name, blob);
  return blob;
};

/** The blob-record equivalent of {@link namedPairs}: turn a name-keyed record
 * of blobs into the wire's name+value pairs, validating each by its own name.
 * Use this instead of `namedPairs` for any record of EntityBlobAssets so the
 * escape-hatch validator actually runs at push time. */
export const blobPairs = (
  record: Record<string, EntityBlobAsset>,
): { name: string; value: EntityBlobAsset }[] =>
  Object.entries(record).map(([name, value]) => {
    validateBlob(name, value);
    return { name, value };
  });
