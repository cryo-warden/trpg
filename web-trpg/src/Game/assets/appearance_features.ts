import { AppearanceFeatureAsset } from "../../stdb/types";

// The TS assets ARE the generated wire types; the helpers just construct
// those generated shapes.
//
// An appearance feature carries only its ROLE: its kind, its priority, and its
// exclusion group. The record KEY is the role's lookup key — other assets refer
// to a feature by that key, and it is what crosses the wire. Display language
// (how a key reads to a person) lives in the locale plugins, never here — see
// renderer/en-us/appearanceFeatures.ts.

// `exclusionGroup` ties a feature into a mutual-exclusion group: features
// sharing one render at most one at a time (see AppearanceFeature). Omitted
// for the vast majority, which stand alone.
const noun = (
  priority: number,
  exclusionGroup?: string,
): AppearanceFeatureAsset => ({
  appearanceFeatureType: { tag: "Noun" },
  priority,
  exclusionGroup,
});

const adjective = (
  priority: number,
  exclusionGroup?: string,
): AppearanceFeatureAsset => ({
  appearanceFeatureType: { tag: "Adjective" },
  priority,
  exclusionGroup,
});

// Identity NOUNS ("skeleton", "zombie") sit ABOVE the baseline "human"
// (priority -100, the always-replaceable body noun) but BELOW the real
// creature bodies (priority 100): an identity replaces "human" but yields
// the noun slot to a wolf or bat, riding along as its paired adjective
// instead. See the grouping vocabulary near the foot of this file.
const IDENTITY_NOUN_PRIORITY = 0;

export const APPEARANCE_FEATURES = {
  human: noun(-100),
  slime: noun(100),
  bat: noun(100),
  bandit: noun(100),
  wolf: noun(100),
  ogre: noun(100),
  rat: noun(100),
  dummy: noun(9000),
  dice: noun(9000),
  bowl: noun(9000),
  deck: noun(9000),
  imp: noun(100),
  sprite: noun(100),
  wisp: noun(100),
  club: noun(5000),
  sword: noun(5000),
  staff: noun(5000),
  shield: noun(5000),
  spear: noun(5000),
  axe: noun(5000),
  dagger: noun(5000),
  jerkin: noun(5000),
  hauberk: noun(5000),
  robe: noun(5000),
  charm: noun(5000),
  talisman: noun(5000),
  bead: noun(5000),
  idol: noun(5000),
  medallion: noun(5000),
  path: noun(10000),
  // Containers — the chance of finding cookies in jars is something to
  // look forward to — and the remains breaking them leaves behind
  // (decoration for now).
  jar: noun(5000),
  chest: noun(5000),
  crate: noun(5000),
  sack: noun(5000),
  barrel: noun(5000),
  rack: noun(5000),
  cabinet: noun(5000),
  urn: noun(5000),
  basket: noun(5000),
  strongbox: noun(5000),
  // Path guards: breakable walls hiding side rooms and backward loops.
  wall: noun(5000),
  barricade: noun(5000),
  // (rubble already exists among the theme decorations below.)
  ceramic_shards: noun(4000),
  scrap_wood: noun(4000),
  torn_cloth: noun(4000),
  // The generic remains any destroyed object leaves when it authored no
  // specific debris. Looked up by name server-side (death_system); a material
  // system will later refine it into "stellar debris", "wood debris", etc.
  debris: noun(4000),
  red_cookie: noun(5000),
  blue_cookie: noun(5000),
  rock: noun(10000),
  stone: noun(10000),
  boulder: noun(10000),
  trail: noun(10000),
  opening: noun(10000),
  hole: noun(10000),
  chasm: noun(10000),
  crack: noun(10000),
  room: noun(10000),
  enclosure: noun(10000),
  tent: noun(10000),
  // Encampment scenery: a training camp reads as a camp, not a rockfall.
  campfire: noun(10000),
  bedroll: noun(10000),
  banner: noun(10000),
  chamber: noun(10000),
  dome: noun(10000),
  cavern: noun(10000),
  grass: noun(10000),
  tree: noun(10000),
  stump: noun(10000),
  log: noun(10000),
  clearing: noun(10000),
  grove: noun(10000),
  thicket: noun(10000),
  hall: noun(10000),
  courtyard: noun(10000),
  crypt: noun(10000),
  gate: noun(10000),
  archway: noun(10000),
  corridor: noun(10000),
  stair: noun(10000),
  rubble: noun(10000),
  // Paired-path opposites: the chasm's far side, and the mouths of
  // cross-map crossings.
  rock_wall: noun(10000),
  cave_mouth: noun(10000),
  // The one sky, seen from every outdoor room through the surface chain.
  sky: noun(10000),
  bones: noun(10000),
  brazier: noun(10000),
  altar: noun(10000),
  pillar: noun(10000),
  shrine: noun(10000),
  sanctum: noun(10000),
  vault: noun(10000),
  hollow: adjective(1000),
  // Boss drops sparkle: the reward that anticipation promised.
  sparkling: adjective(1000),
  // Brightness shares one exclusion group so a path never reads as both
  // "bright" and "dark" (or the redundant "dim, dark").
  dark: adjective(1000, "brightness"),
  bright: adjective(1000, "brightness"),
  dim: adjective(1000, "brightness"),
  // Path-variation adjectives merged into paths at generation. Width is an
  // exclusion group (wide vs narrow); winding/large/hazy stand alone.
  winding: adjective(1000),
  wide: adjective(1000, "width"),
  narrow: adjective(1000, "width"),
  large: adjective(1000),
  hazy: adjective(1000),
  // Enemy variety adjectives. Build (brawny/rangy/scrawny) is one exclusion
  // group so a single creature never reads as two builds; scarred is flavor
  // that stacks with any build.
  brawny: adjective(1000, "build"),
  rangy: adjective(1000, "build"),
  scrawny: adjective(1000, "build"),
  scarred: adjective(1000),
  tiny: adjective(1000),
  small: adjective(900),
  big: adjective(900),
  huge: adjective(1000),
  leather: adjective(1000),
  // Gear-variety adjectives: each pairs with a gear noun to name the item
  // entity ("chain hauberk", "ember charm"). Standalone — no exclusion group.
  chain: adjective(1000),
  traveler: adjective(1000),
  ember: adjective(1000),
  frost: adjective(1000),
  storm: adjective(1000),
  sun: adjective(1000),
  training: adjective(1000),
  scrying: adjective(1000),
  fate: adjective(1000),
  bone: adjective(1000),
  // Undead identities each contribute a NOUN and an ADJECTIVE sharing one
  // exclusion group: "skeleton"/"zombie" replace "human", but only "skeletal"
  // /"zombie" survives on a wolf or bat body — never both forms at once.
  skeleton: noun(IDENTITY_NOUN_PRIORITY, "skeletal"),
  skeletal: adjective(1000, "skeletal"),
  zombie: noun(IDENTITY_NOUN_PRIORITY, "zombie"),
  zombieLike: adjective(1000, "zombie"),
  vampiric: adjective(1000),
  ghostly: adjective(1000),
  fiery: adjective(1000),
  icy: adjective(1000),
  // Weapon condition: one exclusion group so a blade never reads as both
  // rusty and gleaming. Used as item variety (rusty/gleaming/notched/pitted).
  rusty: adjective(1000, "condition"),
  gleaming: adjective(1000, "condition"),
  notched: adjective(1000, "condition"),
  pitted: adjective(1000, "condition"),
  ancient: adjective(1000),
  mossy: adjective(1000),
  crumbling: adjective(1000),
  smoldering: adjective(1000),
  frozen: adjective(1000),
  crackling: adjective(1000),
} satisfies Record<string, AppearanceFeatureAsset>;

export type AppearanceFeatureName = keyof typeof APPEARANCE_FEATURES;
