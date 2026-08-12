import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Relics: up to four worn at once, applied across every stance.
export const RELICS = {
  ember_charm: statBlock({ attack: 1 }),
  frost_talisman: statBlock({ defense: 1 }),
  storm_bead: statBlock({ gait: 1 }),
  bone_idol: statBlock({ mhp: 2 }),
  sun_medallion: statBlock({ mep: 2 }),
} satisfies Record<string, StatBlockAsset>;

export type RelicName = keyof typeof RELICS;
