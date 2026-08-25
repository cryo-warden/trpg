import { EntityBlobAsset } from "../../../stdb/types";
import { applyComponentMap } from "../assetShort";
import { blob } from "../entity_blobs";
import { CreatureAssetShort } from "../types/creature";

/** Expand a creature short into a full entity blob (escape hatch applied).
 * PROCESSING layer: depends only on the authoring type and the true wire types.
 * Readonly authoring arrays are copied into the mutable wire arrays. */
export const creature = (
  ...[baseline, stance, options = {}]: CreatureAssetShort
): EntityBlobAsset =>
  applyComponentMap(
    blob({
      baselineName: baseline,
      stanceName: stance,
      ...(options.traits && { traitNames: [...options.traits] }),
      ...(options.armaments && { armamentNames: [...options.armaments] }),
      ...(options.traitPalette && {
        differentiable: { traitPaletteName: options.traitPalette },
      }),
    }),
    options.componentMap,
  );
