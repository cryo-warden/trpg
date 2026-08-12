import { StatBlockAsset } from "../../stdb/types";
import { ACTIONS } from "./actions";
import { statBlock } from "./stat_block";

export const TRAITS = {
  admin: statBlock({ actionNames: Object.keys(ACTIONS) }),
  mobile: statBlock({ actionNames: ["move"] }),
  bopper: statBlock({ actionNames: ["bop", "boppity_bop"] }),
  tiny: statBlock({ attack: -1, mhp: -2 }),
  small: statBlock({ mhp: -1 }),
  big: statBlock({ mhp: 2 }),
  huge: statBlock({ attack: 1, mhp: 5 }),
} satisfies Record<string, StatBlockAsset>;

export type TraitName = keyof typeof TRAITS;
