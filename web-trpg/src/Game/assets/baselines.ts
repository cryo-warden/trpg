import { GroupedBlockAsset } from "../../stdb/types";
import { statBlock } from "./stat_block";

// Bodies are the primary providers of the counted property stats: hands to
// hold and swing with, gait to move on, reach to threaten at range. A body's
// `hand` counts BOTH the grip slots it has and the free hands it can strike
// with; wielding gear removes free hands. Actions are no longer granted here —
// they DERIVE from readiness (morale, the weapon/limb tags, footing), so a body
// only needs to carry the tags its intended actions require.
export const BASELINES = {
  human: statBlock({
    attack: 0,
    mhp: 5,
    defense: 0,
    mep: 5,
    hand: 2,
    // Equipment capacity: one worn-armor slot and four relic slots — the
    // positive side of the body/relic capacity stats worn gear consumes.
    body: 1,
    relic: 4,
    gait: 2,
    reach: 1,
    // Two legs to stand, stride, and sit on — the footing every upright stance
    // needs, and what a slime lacks.
    foot: 2,
    // A mouth to bite with: humans have no fangs but a jaw all the same, so a
    // plain bite is theirs (a stronger maul wants a predator's jaw).
    jaw: 1,
    size: 0,
    morale: 5,
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
    // Its spray attack derives from the ooze tag.
    ooze: 1,
    // Formless: the amorphous stance is the only posture it can hold (plus
    // prone), and no footing stance is reachable — it has no feet to stand on.
    amorphous: 1,
    appearanceFeatureNames: ["slime"],
  }),
  bat: statBlock({
    attack: 0,
    mhp: 5,
    defense: -1,
    mep: 3,
    gait: 2,
    // Wings, not feet: it perches and flaps, never stands or strides.
    wing: 2,
    size: -4,
    morale: 5,
    // Its scratch derives from the claw tag.
    claw: 1,
    appearanceFeatureNames: ["bat"],
  }),
  // A human body wearing a different life: same slots, different look.
  bandit: statBlock({
    attack: 0,
    mhp: 5,
    defense: 0,
    mep: 4,
    hand: 2,
    body: 1,
    relic: 4,
    gait: 2,
    reach: 1,
    foot: 2,
    jaw: 1,
    size: 0,
    morale: 4,
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
    foot: 2,
    size: 5,
    morale: 6,
    appearanceFeatureNames: ["ogre"],
  }),
  rat: statBlock({
    attack: -1,
    mhp: 2,
    mep: 1,
    gait: 2,
    foot: 2,
    size: -6,
    morale: 2,
    jaw: 1,
    appearanceFeatureNames: ["rat"],
  }),
  wolf: statBlock({
    attack: 1,
    mhp: 6,
    mep: 2,
    gait: 2,
    foot: 2,
    size: -1,
    morale: 3,
    // A predator's jaw: strong enough to unlock the heavier maul, where a rat
    // (jaw 1) or a human only manages a plain bite.
    jaw: 2,
    appearanceFeatureNames: ["wolf"],
  }),
  // The elemental bodies channel innately: focus without any staff, and
  // every casting stance reachable from birth. Their ELEMENT is not the body:
  // fire/ice/lightning natures are traits, so any element can ride any body.
  imp: statBlock({
    attack: 1,
    mhp: 3,
    mep: 6,
    hand: 1,
    gait: 1,
    focus: 1,
    // Legged, so it can stand as well as cast; sprite and wisp instead FLOAT —
    // no feet — and only ever channel, so their footing is deliberately absent.
    foot: 2,
    size: -3,
    morale: 4,
    appearanceFeatureNames: ["imp"],
  }),
  sprite: statBlock({
    mhp: 4,
    defense: 2,
    mep: 6,
    gait: 1,
    focus: 1,
    // A floating, part-incorporeal being: no feet, but it can go intangible.
    ethereal: 1,
    size: -3,
    morale: 4,
    appearanceFeatureNames: ["sprite"],
  }),
  wisp: statBlock({
    mhp: 2,
    mep: 8,
    gait: 3,
    focus: 1,
    ethereal: 1,
    size: -3,
    morale: 4,
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
} satisfies Record<string, GroupedBlockAsset>;

export type BaselineName = keyof typeof BASELINES;
