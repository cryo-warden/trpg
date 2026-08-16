import { TraitPaletteAsset } from "../../stdb/types";

// A trait PALETTE is the set of traits eligible to be drawn onto a
// differentiable entity, plus how many to draw. At spawn, co-located members
// sharing a palette get DISTINCT draws, so a pack reads as individuals. The
// stat-bearing entries are signed so the pack's expected total stays flat
// (brawny +hp is offset by scrawny -hp); scarred is pure flavor.
export const TRAIT_PALETTES = {
  wolf_variety: {
    traitNames: ["brawny", "rangy", "scrawny", "scarred"],
    // Index = number of traits drawn: mostly one, sometimes two, rarely three,
    // occasionally none.
    countWeights: new Uint8Array([10, 70, 15, 5]),
  },
} satisfies Record<string, TraitPaletteAsset>;

export type TraitPaletteName = keyof typeof TRAIT_PALETTES;
