import { EntityBlobAsset } from "../../stdb/types";
import { armor } from "./gear";

// Clothing/armor: ONE global slot, applied across every stance (unlike
// armaments, which are assigned per stance in the customization menu). Each
// consumes the lone body point (body: -1), so a body with body capacity 1
// applies at most one worn armor at a time.
export const ARMORS = {
  // Worn protection steadies the nerve a little (morale 1), early game.
  leather_jerkin: armor({ defense: 1, morale: 1, body: -1 }, [
    "leather",
    "jerkin",
  ]),
  chain_hauberk: armor({ defense: 2, gait: -1, morale: 1, body: -1 }, [
    "chain",
    "hauberk",
  ]),
  // NO mhp/mep on swappable gear: the maxima are a RATCHET (a swappable
  // source would be a one-time permanent boost). Kindred stats instead.
  traveler_robe: armor({ focus: 1, morale: 1, body: -1 }, [
    "traveler",
    "robe",
  ]),
} satisfies Record<string, EntityBlobAsset>;

export type ArmorName = keyof typeof ARMORS;
