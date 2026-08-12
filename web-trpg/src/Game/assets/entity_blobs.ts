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
  traitNames: ["admin", "mobile", "bopper"],
  // Ordered: bar position auto-assigns the numeric hotkey (1..9, then 0).
  pinnedActionNames: ["boppity_bop", "quick_move", "divine_heal"],
  allegiance: {
    allegianceEntityId: { tag: "Named", value: "allegiance1" },
  },
});
