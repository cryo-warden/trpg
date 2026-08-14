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
} satisfies Record<string, QuestAsset>;

export type QuestName = keyof typeof QUESTS;
