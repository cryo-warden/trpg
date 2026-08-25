import { EntityBlobAsset } from "../../stdb/types";
import { ArmamentName } from "./armaments";
import { applyComponentMap, EntityBlobShort } from "./assetShort";
import { BaselineName } from "./baselines";
import { blob } from "./entity_blobs";
import { StanceName } from "./stances";
import { TraitName } from "./traits";
import { TraitPaletteName } from "./trait_palettes";

/** A CREATURE short as a TUPLE: the required body (baseline) and posture
 * (stance) are positional; everything optional rides the trailing options
 * object. The tuple IS {@link creature}'s parameter list — spread straight in.
 * Every cross-reference is NAME-TYPED — a mistyped baseline/stance/trait/
 * armament is a compile error, the hole the bare `blob()` cast left open. HP/EP
 * and the rest derive from the baseline server-side, so a creature short states
 * only what distinguishes THIS body. Whatever a shorthand cannot say (a fixed
 * allegiance, a placed location) goes through the `entity` escape hatch. */
export type CreatureAssetShort = [
  baseline: BaselineName,
  stance: StanceName,
  options?: {
    traits?: TraitName[];
    armaments?: ArmamentName[];
    /** A trait palette to roll per instance, so a group reads as individuals
     * ("brawny/rangy wolf") instead of "wolf 1-4". */
    traitPalette?: TraitPaletteName;
    /** Escape hatch: a component-level overlay for the one-off field no
     * shorthand covers (a fixed allegiance, a placed location). */
    componentMap?: EntityBlobShort;
  },
];

/** Expand a creature short into a full entity blob (escape hatch applied). */
export const creature = (
  ...[baseline, stance, options = {}]: CreatureAssetShort
): EntityBlobAsset =>
  applyComponentMap(
    blob({
      baselineName: baseline,
      stanceName: stance,
      ...(options.traits && { traitNames: options.traits }),
      ...(options.armaments && { armamentNames: options.armaments }),
      ...(options.traitPalette && {
        differentiable: { traitPaletteName: options.traitPalette },
      }),
    }),
    options.componentMap,
  );
