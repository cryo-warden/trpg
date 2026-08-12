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
  // NATURE traits: a nature rides a body (skeletal human, fiery imp — any
  // element on any body). Appearance-only for now, on purpose: a damage
  // ATTRIBUTE system — not quite the usual damage types — is planned to
  // give these natures mechanical flavor (see the player-damage-attributes
  // user story).
  skeletal: statBlock({ appearanceFeatureNames: ["skeletal"] }),
  zombie: statBlock({ appearanceFeatureNames: ["zombie"] }),
  vampire: statBlock({ appearanceFeatureNames: ["vampiric"] }),
  ghost: statBlock({ appearanceFeatureNames: ["ghostly"] }),
  fire_nature: statBlock({ appearanceFeatureNames: ["fiery"] }),
  ice_nature: statBlock({ appearanceFeatureNames: ["icy"] }),
  lightning_nature: statBlock({ appearanceFeatureNames: ["crackling"] }),
} satisfies Record<string, StatBlockAsset>;

export type TraitName = keyof typeof TRAITS;
