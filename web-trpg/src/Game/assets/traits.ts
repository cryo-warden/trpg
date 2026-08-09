import { StatBlockAsset } from ".";
import { ACTIONS, ActionName } from "./actions";

export const TRAITS = {
  admin: { actionNames: Object.keys(ACTIONS) as ActionName[] },
  mobile: { actionNames: ["move"] },
  bopper: { actionNames: ["bop", "boppity_bop"] },
  tiny: { attack: -1, mhp: -2 },
  small: { mhp: -1 },
  big: { mhp: 2 },
  huge: { attack: 1, mhp: 5 },
} as const satisfies Record<string, StatBlockAsset>;

export type TraitName = keyof typeof TRAITS;
