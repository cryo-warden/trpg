import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Clothing/armor: ONE global slot, applied across every stance (unlike
// armaments, which are assigned per stance in the loadout menu).
export const ARMORS = {
  leather_jerkin: statBlock({ defense: 1 }),
  chain_hauberk: statBlock({ defense: 2, gait: -1 }),
  // NO mhp/mep on swappable gear: max pools are a RATCHET (a swappable
  // source would be a one-time permanent boost). Kindred stats instead.
  traveler_robe: statBlock({ focus: 1 }),
} satisfies Record<string, StatBlockAsset>;

export type ArmorName = keyof typeof ARMORS;

/** What a person reads on an armor button (see ARMAMENT_DISPLAY_NAMES). */
export const ARMOR_DISPLAY_NAMES: Record<ArmorName, string> = {
  leather_jerkin: "Leather Jerkin",
  chain_hauberk: "Chain Hauberk",
  traveler_robe: "Traveler's Robe",
};
