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
    // Rally IS here: an ordinary morale buff every person can reach for,
    // the counterplay to fear (which enemies simply wait out).
    actionNames: [
      "attune",
      "stand",
      "sit",
      "lie_down",
      "ready_up",
      "square_up",
      "duel",
      "stride",
      "rally",
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
  // STRUCTURAL FEATURES. A path is a physical crossing: its noun is a baseline
  // and any adjectives are traits, the same way a creature is a body plus
  // traits. Tough — high HP and defense — so a beginner can't casually collapse
  // a corridor; but not indestructible, so a crack smashed hard enough caves
  // in. Paired directions share HP (an HpShare linked at generation), so
  // breaking one collapses both.
  trail: statBlock({ appearanceFeatureNames: ["trail"], mhp: 40, defense: 8 }),
  path: statBlock({ appearanceFeatureNames: ["path"], mhp: 40, defense: 8 }),
  opening: statBlock({ appearanceFeatureNames: ["opening"], mhp: 40, defense: 8 }),
  hole: statBlock({ appearanceFeatureNames: ["hole"], mhp: 40, defense: 8 }),
  chasm: statBlock({ appearanceFeatureNames: ["chasm"], mhp: 40, defense: 8 }),
  rock_wall: statBlock({ appearanceFeatureNames: ["rock_wall"], mhp: 40, defense: 8 }),
  crack: statBlock({ appearanceFeatureNames: ["crack"], mhp: 40, defense: 8 }),
  archway: statBlock({ appearanceFeatureNames: ["archway"], mhp: 40, defense: 8 }),
  gate: statBlock({ appearanceFeatureNames: ["gate"], mhp: 40, defense: 8 }),
  corridor: statBlock({ appearanceFeatureNames: ["corridor"], mhp: 40, defense: 8 }),
  stair: statBlock({ appearanceFeatureNames: ["stair"], mhp: 40, defense: 8 }),
  cave_mouth: statBlock({ appearanceFeatureNames: ["cave_mouth"], mhp: 40, defense: 8 }),
  // Differentiable armory pieces: the noun is a baseline, the rolled condition
  // (rusty/gleaming/…) a trait. Small breakable objects you would sooner take
  // than smash.
  sword: statBlock({ appearanceFeatureNames: ["sword"], mhp: 8, defense: 2 }),
  shield: statBlock({ appearanceFeatureNames: ["shield"], mhp: 8, defense: 2 }),
  staff: statBlock({ appearanceFeatureNames: ["staff"], mhp: 8, defense: 2 }),
  // SCENERY. A physical object is a baseline (the noun) plus, where the name
  // carries an adjective, a trait — its look and its stats from one place, like
  // a creature. Most scenery is far tougher than any beginner or early monster;
  // soft things still keep a point of defense. Broken, it leaves debris.
  rock: statBlock({ appearanceFeatureNames: ["rock"], mhp: 25, defense: 5 }),
  stone: statBlock({ appearanceFeatureNames: ["stone"], mhp: 25, defense: 5 }),
  boulder: statBlock({ appearanceFeatureNames: ["boulder"], mhp: 25, defense: 5 }),
  tree: statBlock({ appearanceFeatureNames: ["tree"], mhp: 25, defense: 5 }),
  rubble: statBlock({ appearanceFeatureNames: ["rubble"], mhp: 25, defense: 5 }),
  brazier: statBlock({ appearanceFeatureNames: ["brazier"], mhp: 25, defense: 5 }),
  pillar: statBlock({ appearanceFeatureNames: ["pillar"], mhp: 25, defense: 5 }),
  altar: statBlock({ appearanceFeatureNames: ["altar"], mhp: 25, defense: 5 }),
  stump: statBlock({ appearanceFeatureNames: ["stump"], mhp: 12, defense: 2 }),
  log: statBlock({ appearanceFeatureNames: ["log"], mhp: 12, defense: 2 }),
  banner: statBlock({ appearanceFeatureNames: ["banner"], mhp: 12, defense: 2 }),
  bones: statBlock({ appearanceFeatureNames: ["bones"], mhp: 12, defense: 2 }),
  grass: statBlock({ appearanceFeatureNames: ["grass"], mhp: 6, defense: 1 }),
  campfire: statBlock({ appearanceFeatureNames: ["campfire"], mhp: 6, defense: 1 }),
  bedroll: statBlock({ appearanceFeatureNames: ["bedroll"], mhp: 6, defense: 1 }),
  // The practice dummy: made to be hit — modest HP, no defense so a beginner
  // sees real damage. "training" rides as a trait.
  dummy: statBlock({ appearanceFeatureNames: ["dummy"], mhp: 10, defense: 0 }),
} satisfies Record<string, StatBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
