import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Clothing/armor: ONE global slot, applied across every stance (unlike
// armaments, which are assigned per stance in the loadout menu).
export const ARMORS = {
  leather_jerkin: statBlock({ defense: 1 }),
  chain_hauberk: statBlock({ defense: 2, gait: -1 }),
  traveler_robe: statBlock({ mep: 2 }),
} satisfies Record<string, StatBlockAsset>;

export type ArmorName = keyof typeof ARMORS;
