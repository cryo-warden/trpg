import { EntityBlobAsset } from "../../stdb/types";
import { ArmamentName } from "./armaments";
import { applyEntity, EntityShort } from "./assetShort";
import { BaselineName } from "./baselines";
import { blob } from "./entity_blobs";
import { StanceName } from "./stances";
import { TraitName } from "./traits";
import { TraitPaletteName } from "./trait_palettes";

/** A CREATURE short: a body (baseline) holding a posture (stance), optionally
 * carrying natures (traits), wielding armaments, and rolling per-instance
 * variety from a palette. Every cross-reference is NAME-TYPED — a mistyped
 * baseline/stance/trait/armament is a compile error, the hole the bare `blob()`
 * cast left open. HP/EP and the rest derive from the baseline server-side, so a
 * creature short states only what distinguishes THIS body. Whatever a
 * shorthand cannot say (a fixed allegiance, a placed location) goes through the
 * `entity` escape hatch. */
export type CreatureAssetShort = EntityShort & {
  baseline: BaselineName;
  stance: StanceName;
  traits?: TraitName[];
  armaments?: ArmamentName[];
  /** A trait palette to roll per instance, so a group reads as individuals
   * ("brawny/rangy wolf") instead of "wolf 1-4". */
  variety?: TraitPaletteName;
};

/** Expand a creature short into a full entity blob (escape hatch applied). */
export const creature = ({
  baseline,
  stance,
  traits,
  armaments,
  variety,
  entity,
}: CreatureAssetShort): EntityBlobAsset =>
  applyEntity(
    blob({
      baselineName: baseline,
      stanceName: stance,
      ...(traits && { traitNames: traits }),
      ...(armaments && { armamentNames: armaments }),
      ...(variety && { differentiable: { traitPaletteName: variety } }),
    }),
    entity,
  );
