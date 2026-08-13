import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

const CASTING_STANCES = [
  "standing",
  "casting",
  "fire_casting",
  "ice_casting",
  "lightning_casting",
];

const CASTING_POSTURES = ["stand", "center", "kindle", "chill", "charge"];

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
    size: 0,
    morale: 5,
    actionNames: [
      "take",
      "drop",
      "attune",
      "stand",
      "sit",
      "lie_down",
      "ready_up",
      "square_up",
      "duel",
      "stride",
    ],
    appearanceFeatureNames: ["human"],
    stanceNames: [
      "standing",
      "prone",
      "sitting",
      "ready",
      "brawler",
      "dueling",
      "striding",
    ],
  }),
  slime: statBlock({
    attack: -1,
    mhp: 3,
    defense: -1,
    mep: 2,
    gait: 1,
    size: -2,
    morale: 3,
    actionNames: ["slime_spray", "slump"],
    appearanceFeatureNames: ["slime"],
    stanceNames: ["amorphous"],
  }),
  bat: statBlock({
    attack: 0,
    mhp: 5,
    defense: -1,
    mep: 3,
    gait: 2,
    wing: 2,
    size: -4,
    morale: 5,
    actionNames: ["scratch", "perch", "take_wing"],
    appearanceFeatureNames: ["bat"],
    stanceNames: ["perched", "flapping"],
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
    size: 0,
    morale: 4,
    actionNames: [
      "take",
      "drop",
      "attune",
      "stand",
      "sit",
      "lie_down",
      "ready_up",
      "square_up",
      "duel",
      "stride",
    ],
    appearanceFeatureNames: ["bandit"],
    stanceNames: [
      "standing",
      "prone",
      "sitting",
      "ready",
      "brawler",
      "dueling",
      "striding",
    ],
  }),
  // Starting-area teachers. The ogre looms: size delta plus its smash
  // telegraph overwhelms a fresh human's nerve — the intended first lesson
  // in breaking, rallying, and crawling away. The rat is the same lesson
  // from the strong side: a human just ACTING near one breaks it.
  ogre: statBlock({
    attack: 1,
    mhp: 15,
    mep: 2,
    hand: 2,
    gait: 1,
    reach: 1,
    size: 5,
    morale: 6,
    appearanceFeatureNames: ["ogre"],
    stanceNames: ["standing", "striding"],
  }),
  rat: statBlock({
    attack: -1,
    mhp: 2,
    mep: 1,
    gait: 2,
    size: -6,
    morale: 2,
    actionNames: ["bite"],
    appearanceFeatureNames: ["rat"],
    stanceNames: ["standing"],
  }),
  wolf: statBlock({
    attack: 1,
    mhp: 6,
    mep: 2,
    gait: 2,
    size: -1,
    morale: 3,
    actionNames: ["bite", "stand", "lie_down", "stride"],
    appearanceFeatureNames: ["wolf"],
    stanceNames: ["standing", "prone", "striding"],
  }),
  // The elemental bodies channel innately: focus without any staff, and
  // every casting stance known from birth. Their ELEMENT is not the body:
  // fire/ice/lightning natures are traits, so any element can ride any body.
  imp: statBlock({
    attack: 1,
    mhp: 3,
    mep: 6,
    hand: 1,
    gait: 1,
    focus: 1,
    size: -3,
    morale: 4,
    actionNames: CASTING_POSTURES,
    appearanceFeatureNames: ["imp"],
    stanceNames: CASTING_STANCES,
  }),
  sprite: statBlock({
    mhp: 4,
    defense: 2,
    mep: 6,
    gait: 1,
    focus: 1,
    size: -3,
    morale: 4,
    actionNames: CASTING_POSTURES,
    appearanceFeatureNames: ["sprite"],
    stanceNames: CASTING_STANCES,
  }),
  wisp: statBlock({
    mhp: 2,
    mep: 8,
    gait: 3,
    focus: 1,
    size: -3,
    morale: 4,
    actionNames: CASTING_POSTURES,
    appearanceFeatureNames: ["wisp"],
    stanceNames: CASTING_STANCES,
  }),
} satisfies Record<string, StatBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
