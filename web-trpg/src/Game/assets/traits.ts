import { StatBlockAsset } from "../../stdb/types";
import { ACTIONS } from "./actions";
import { statBlock } from "./stat_block";

export const TRAITS = {
  admin: statBlock({
    actionNames: Object.keys(ACTIONS),
  }),
  mobile: statBlock({ actionNames: ["move"] }),
  bopper: statBlock({ actionNames: ["bop", "boppity_bop"] }),
  tiny: statBlock({ attack: -1, mhp: -2, size: -4 }),
  small: statBlock({ mhp: -1, size: -1 }),
  big: statBlock({ mhp: 2, size: 1 }),
  huge: statBlock({ attack: 1, mhp: 5, size: 3, morale: 2 }),
  // NATURE traits: a nature rides a body (skeletal human, fiery imp — any
  // element on any body). Appearance-only for now, on purpose: a damage
  // ATTRIBUTE system — not quite the usual damage types — is planned to
  // give these natures mechanical flavor (see the player-damage-attributes
  // user story).
  // Undead identities contribute BOTH a noun and an adjective; the renderer
  // picks one — "skeleton"/"zombie" over a human body, "skeletal"/"zombie"
  // over any other.
  skeletal: statBlock({ appearanceFeatureNames: ["skeleton", "skeletal"] }),
  zombie: statBlock({ appearanceFeatureNames: ["zombie", "zombieLike"] }),
  // Path-variation traits: adjective-bearing traits rolled onto paths at
  // generation. A path's baseline has max HP 0 (a bodiless feature), so these
  // surface as its look through the ordinary trait pipeline without ever
  // giving it HP — pure atmosphere. Their appearance features carry the
  // exclusion groups (width, brightness) that keep a single path from reading
  // as both "wide" and "narrow".
  winding: statBlock({ appearanceFeatureNames: ["winding"] }),
  wide: statBlock({ appearanceFeatureNames: ["wide"] }),
  narrow: statBlock({ appearanceFeatureNames: ["narrow"] }),
  large: statBlock({ appearanceFeatureNames: ["large"] }),
  bright: statBlock({ appearanceFeatureNames: ["bright"] }),
  dim: statBlock({ appearanceFeatureNames: ["dim"] }),
  dark: statBlock({ appearanceFeatureNames: ["dark"] }),
  hazy: statBlock({ appearanceFeatureNames: ["hazy"] }),
  // Authored path adjective (not rolled): the crumbling stair wears it on
  // both directions.
  crumbling: statBlock({ appearanceFeatureNames: ["crumbling"] }),
  // Scenery adjectives: the modifier half of a decoration's name (a mossy
  // rock, a smoldering brazier), riding its noun baseline as a trait. Pure
  // appearance — the object's durability lives on the baseline.
  mossy: statBlock({ appearanceFeatureNames: ["mossy"] }),
  smoldering: statBlock({ appearanceFeatureNames: ["smoldering"] }),
  frozen: statBlock({ appearanceFeatureNames: ["frozen"] }),
  crackling: statBlock({ appearanceFeatureNames: ["crackling"] }),
  training: statBlock({ appearanceFeatureNames: ["training"] }),
  // Enemy variety traits, signed so a pack's expected stats stay flat: brawny
  // (+hp) is balanced by scrawny (-hp), rangy trades a step of speed, scarred
  // is flavor only. Drawn distinctly across a pack via a trait palette.
  brawny: statBlock({ mhp: 2, appearanceFeatureNames: ["brawny"] }),
  rangy: statBlock({ gait: 1, appearanceFeatureNames: ["rangy"] }),
  scrawny: statBlock({ mhp: -2, appearanceFeatureNames: ["scrawny"] }),
  scarred: statBlock({ appearanceFeatureNames: ["scarred"] }),
  // Item variety: appearance-only condition. An item's mechanical worth rides
  // its asset, not the entity, so these carry no stats — only a look.
  rusty: statBlock({ appearanceFeatureNames: ["rusty"] }),
  gleaming: statBlock({ appearanceFeatureNames: ["gleaming"] }),
  notched: statBlock({ appearanceFeatureNames: ["notched"] }),
  pitted: statBlock({ appearanceFeatureNames: ["pitted"] }),
  vampire: statBlock({ appearanceFeatureNames: ["vampiric"] }),
  ghost: statBlock({ appearanceFeatureNames: ["ghostly"] }),
  fire_nature: statBlock({ appearanceFeatureNames: ["fiery"] }),
  ice_nature: statBlock({ appearanceFeatureNames: ["icy"] }),
  lightning_nature: statBlock({ appearanceFeatureNames: ["crackling"] }),
} satisfies Record<string, StatBlockAsset>;

export type TraitName = keyof typeof TRAITS;
