import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Bodies are the primary providers of the counted property stats: hands to
// hold and swing with, gait to move on, reach to threaten at range. Stances
// and (later) equipment and circumstances add to or consume these.
export const BASELINES = {
  human: statBlock({
    attack: 0,
    mhp: 5,
    defense: 0,
    mep: 5,
    hand: 2,
    gait: 2,
    reach: 1,
    actionNames: ["take", "drop"],
    appearanceFeatureNames: ["human"],
  }),
  slime: statBlock({
    attack: -1,
    mhp: 3,
    defense: -1,
    mep: 2,
    gait: 1,
    actionNames: ["slime_spray"],
    appearanceFeatureNames: ["slime"],
  }),
  bat: statBlock({
    attack: 0,
    mhp: 5,
    defense: -1,
    mep: 3,
    gait: 2,
    wing: 2,
    actionNames: ["scratch"],
    appearanceFeatureNames: ["bat"],
  }),
  // A human body wearing a different life: same slots, different look.
  bandit: statBlock({
    attack: 0,
    mhp: 5,
    defense: 0,
    mep: 4,
    hand: 2,
    gait: 2,
    reach: 1,
    actionNames: ["take", "drop"],
    appearanceFeatureNames: ["bandit"],
  }),
  wolf: statBlock({
    attack: 1,
    mhp: 6,
    mep: 2,
    gait: 2,
    actionNames: ["bite"],
    appearanceFeatureNames: ["wolf"],
  }),
  // The elemental bodies channel innately: focus without any staff. Their
  // ELEMENT is not the body: fire/ice/lightning natures are traits, so any
  // element can ride any body.
  imp: statBlock({
    attack: 1,
    mhp: 3,
    mep: 6,
    hand: 1,
    gait: 1,
    focus: 1,
    appearanceFeatureNames: ["imp"],
  }),
  sprite: statBlock({
    mhp: 4,
    defense: 2,
    mep: 6,
    gait: 1,
    focus: 1,
    appearanceFeatureNames: ["sprite"],
  }),
  wisp: statBlock({
    mhp: 2,
    mep: 8,
    gait: 3,
    focus: 1,
    appearanceFeatureNames: ["wisp"],
  }),
} satisfies Record<string, StatBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
