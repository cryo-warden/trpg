import { QuestAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Quests: each progress bit grants perBitStatBlock once (total = per-bit x
// popcount); bitCount is the WORLD-WIDE supply, spread across maps by the
// per-map spawn windows. The cookie quests are the first legitimate
// mhp/mep sources under the maxima ratchet: limited, permanent,
// progression-shaped — bits only ever turn on.
export const QUESTS = {
  red_cookies: {
    perBitBlock: statBlock({ mhp: 1 }),
    bitCount: 10,
  },
  blue_cookies: {
    perBitBlock: statBlock({ mep: 1 }),
    bitCount: 10,
  },
  // A boss quest: no spawn windows (the bit never lies in a jar) — its
  // room claim in old_keep spawns the warden, whose fall drops one
  // sparkling cookie per player present (+2 mhp when eaten).
  warden_of_the_keep: {
    perBitBlock: statBlock({ mhp: 2 }),
    bitCount: 1,
  },
} satisfies Record<string, QuestAsset>;

export type QuestName = keyof typeof QUESTS;

/** What a person reads wherever a quest labels its items (see
 * ARMAMENT_DISPLAY_NAMES). */
export const QUEST_DISPLAY_NAMES: Record<QuestName, string> = {
  red_cookies: "Red Cookies",
  blue_cookies: "Blue Cookies",
  warden_of_the_keep: "Warden of the Keep",
};
