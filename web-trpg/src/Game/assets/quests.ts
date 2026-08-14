import { QuestAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Quests: each progress bit grants perBitStatBlock once (total = per-bit x
// popcount); bitCount is the WORLD-WIDE supply, spread across maps by the
// per-map spawn windows. The cookie quests are the first legitimate
// mhp/mep sources under the max-pool ratchet: limited, permanent,
// progression-shaped — bits only ever turn on.
export const QUESTS = {
  red_cookies: {
    perBitStatBlock: statBlock({ mhp: 1 }),
    bitCount: 10,
  },
  blue_cookies: {
    perBitStatBlock: statBlock({ mep: 1 }),
    bitCount: 10,
  },
  // A boss quest: no spawn windows (the bit never lies in a jar) — its
  // room claim in old_keep spawns the warden, whose fall drops one
  // sparkling cookie per player present (+2 mhp when eaten).
  warden_of_the_keep: {
    perBitStatBlock: statBlock({ mhp: 2 }),
    bitCount: 1,
  },
} satisfies Record<string, QuestAsset>;

export type QuestName = keyof typeof QUESTS;
