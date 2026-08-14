import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Relics: up to four worn at once, applied across every stance. NO mhp/mep
// on swappable gear: max pools are a RATCHET (a swappable source would be
// a one-time permanent boost). Kindred stats instead.
export const RELICS = {
  ember_charm: statBlock({ attack: 1 }),
  frost_talisman: statBlock({ defense: 1 }),
  storm_bead: statBlock({ gait: 1 }),
  bone_idol: statBlock({ defense: 1 }),
  sun_medallion: statBlock({ focus: 1 }),
} satisfies Record<string, StatBlockAsset>;

export type RelicName = keyof typeof RELICS;
