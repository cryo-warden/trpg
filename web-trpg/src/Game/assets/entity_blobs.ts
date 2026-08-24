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
  // The world's open air: the location every map's rooms nest into (via
  // each map's roomLocation field — Exterior for outdoor maps). Never
  // rendered itself; only its contents show, through Exterior edges.
  world_surface: blob({}),
  // ONE sky, visible from every exterior room through the edge chain.
  sky: blob({
    appearanceFeatureNames: ["sky"],
    location: {
      locationEntityId: { tag: "Named", value: "world_surface" },
      kind: { tag: "Exterior" },
    },
  }),
} satisfies Record<string, EntityBlobAsset>;

export const NEW_PLAYER_BLOB = blob({
  baselineName: "human",
  // Standing is the improvising default; the sword makes the dueling stance
  // reachable and grants slash. One hand stays free, so bop survives.
  stanceName: "standing",
  armamentNames: ["sword"],
  // A REASONABLE DEFAULT HUMAN: no authored traits. The human baseline already
  // moves (gait 2) and keeps a free hand for bop while wielding the sword, so
  // the old mobile/bopper grants were unnecessary; admin is a role on the
  // account, not a body plan.
  // NO authored default hotkeys: the bar derives from stats and focus,
  // and slots are the player's to configure (see the home-row scheme).
  allegiance: {
    allegianceEntityId: { tag: "Named", value: "allegiance1" },
  },
  // Where a fresh player wakes: the starting zone's first checkpoint. The
  // player-location invariant seats them here (generating the map for their
  // party if needed) — no hardcoded "first map" rule.
  checkpoint: { locationMapName: "start_zone", checkpointIndex: 0 },
});
