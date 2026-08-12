import { StatBlockAsset } from "../../stdb/types";
import { ACTIONS } from "./actions";

const statBlock = (partial: Partial<StatBlockAsset>): StatBlockAsset => ({
  attack: 0,
  mhp: 0,
  defense: 0,
  mep: 0,
  actionNames: [],
  appearanceFeatureNames: [],
  ...partial,
});

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
