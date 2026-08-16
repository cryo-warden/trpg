import { StatBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

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
    // The item verbs (take/drop/equip/unequip/eat) are NOT here: they
    // are derived offers, computed from the target's components against
    // the special-action registry — no body innately "knows" them.
    actionNames: [
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
    // The item verbs (take/drop/equip/unequip/eat) are NOT here: they
    // are derived offers, computed from the target's components against
    // the special-action registry — no body innately "knows" them.
    actionNames: [
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
  }),
  // BODILESS BODIES. A path or a differentiable item takes its whole look
  // through the stat pipeline — its base noun is a baseline and any adjectives
  // are traits, the same way a creature is a body plus traits. These carry no
  // stats at all: with max HP 0 the pool guard gives them no HP, so they show
  // their adjectives yet stay un-attackable. (Inert scenery that never
  // computes still authors its features directly; lightweight objects that
  // just need durability author an hp component, no baseline.)
  trail: statBlock({ appearanceFeatureNames: ["trail"] }),
  path: statBlock({ appearanceFeatureNames: ["path"] }),
  opening: statBlock({ appearanceFeatureNames: ["opening"] }),
  hole: statBlock({ appearanceFeatureNames: ["hole"] }),
  chasm: statBlock({ appearanceFeatureNames: ["chasm"] }),
  rock_wall: statBlock({ appearanceFeatureNames: ["rock_wall"] }),
  crack: statBlock({ appearanceFeatureNames: ["crack"] }),
  archway: statBlock({ appearanceFeatureNames: ["archway"] }),
  gate: statBlock({ appearanceFeatureNames: ["gate"] }),
  corridor: statBlock({ appearanceFeatureNames: ["corridor"] }),
  stair: statBlock({ appearanceFeatureNames: ["stair"] }),
  cave_mouth: statBlock({ appearanceFeatureNames: ["cave_mouth"] }),
  // Differentiable armory pieces: the noun is a baseline, the rolled
  // condition (rusty/gleaming/…) a trait.
  sword: statBlock({ appearanceFeatureNames: ["sword"] }),
  shield: statBlock({ appearanceFeatureNames: ["shield"] }),
  staff: statBlock({ appearanceFeatureNames: ["staff"] }),
} satisfies Record<string, StatBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
