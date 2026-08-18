import { GearAsset } from "../../stdb/types";
import { gear, statBlock } from "./stat_block";

// Relics: up to four worn at once, applied across every stance. Each consumes
// one relic slot (relic: -1), so a body with relic capacity 4 applies at most
// four at a time. NO mhp/mep on swappable gear: the maxima are a RATCHET (a
// swappable source would be a one-time permanent boost). Kindred stats instead.
export const RELICS = {
  ember_charm: gear(statBlock({ attack: 1, relic: -1 }), ["ember", "charm"]),
  frost_talisman: gear(statBlock({ defense: 1, relic: -1 }), ["frost", "talisman"]),
  storm_bead: gear(statBlock({ gait: 1, relic: -1 }), ["storm", "bead"]),
  bone_idol: gear(statBlock({ defense: 1, relic: -1 }), ["bone", "idol"]),
  sun_medallion: gear(statBlock({ focus: 1, relic: -1 }), ["sun", "medallion"]),
} satisfies Record<string, GearAsset>;

export type RelicName = keyof typeof RELICS;

/** What a person reads on a relic button (see ARMAMENT_DISPLAY_NAMES). */
export const RELIC_DISPLAY_NAMES: Record<RelicName, string> = {
  ember_charm: "Ember Charm",
  frost_talisman: "Frost Talisman",
  storm_bead: "Storm Bead",
  bone_idol: "Bone Idol",
  sun_medallion: "Sun Medallion",
};
