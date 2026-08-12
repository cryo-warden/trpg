import { EntityBlobAsset } from "../../stdb/types";

/** Types the sparse blob literal as the full generated asset: absent
 * components are simply undefined. No conversion — the value IS the wire
 * type. */
export const blob = (partial: Partial<EntityBlobAsset>): EntityBlobAsset =>
  partial as EntityBlobAsset;

/** Blobs instantiated at push time and registered under their Record key, so
 * other blobs can reference them with Named selectors. */
export const NAMED_ENTITY_BLOBS = {
  allegiance1: blob({}),
  allegiance2: blob({}),
} satisfies Record<string, EntityBlobAsset>;

export const NEW_PLAYER_BLOB = blob({
  baselineName: "human",
  // Standing is the improvising default; the sword makes the dueling stance
  // reachable and grants slash. One hand stays free, so bop survives.
  stanceName: "standing",
  armamentNames: ["sword"],
  traitNames: ["admin", "mobile", "bopper"],
  // Ordered: bar position auto-assigns the numeric hotkey (1..9, then 0).
  pinnedActionNames: ["slash", "boppity_bop", "quick_move", "divine_heal"],
  allegiance: {
    allegianceEntityId: { tag: "Named", value: "allegiance1" },
  },
});
