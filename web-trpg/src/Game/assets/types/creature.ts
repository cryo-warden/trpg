import { ArmamentName } from "../armaments";
import { EntityBlobShort } from "../assetShort";
import { BaselineName } from "../baselines";
import { StanceName } from "../stances";
import { TraitName } from "../traits";
import { TraitPaletteName } from "../trait_palettes";

/** A CREATURE short as a TUPLE: the required body (baseline) and posture
 * (stance) are positional; everything optional rides the trailing options
 * object. Pure AUTHORING type — no processing, no wire types. Every
 * cross-reference is a NAME (see the *Name types), so a row is representable as
 * plain data and can be shared/reused, never nesting another asset. */
export type CreatureAssetShort = [
  baseline: BaselineName,
  stance: StanceName,
  options?: {
    traits?: readonly TraitName[];
    armaments?: readonly ArmamentName[];
    /** A trait palette to roll per instance, so a group reads as individuals
     * ("brawny/rangy wolf") instead of "wolf 1-4". */
    traitPalette?: TraitPaletteName;
    /** Escape hatch: a component-level overlay for the one-off field no
     * shorthand covers (a fixed allegiance, a placed location). */
    componentMap?: EntityBlobShort;
  },
];
