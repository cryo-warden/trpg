import { AppearanceFeatureAsset } from "../../stdb/types";

// The TS assets ARE the generated wire types; the helpers just construct
// those generated shapes.

const noun = (text: string, priority: number): AppearanceFeatureAsset => ({
  text,
  appearanceFeatureType: { tag: "Noun" },
  priority,
});

const adjective = (
  text: string,
  priority: number,
): AppearanceFeatureAsset => ({
  text,
  appearanceFeatureType: { tag: "Adjective" },
  priority,
});

export const APPEARANCE_FEATURES = {
  human: noun("human", -100),
  slime: noun("slime", 100),
  bat: noun("bat", 100),
  bandit: noun("bandit", 100),
  wolf: noun("wolf", 100),
  ogre: noun("ogre", 100),
  rat: noun("rat", 100),
  dummy: noun("dummy", 9000),
  dice: noun("dice", 9000),
  bowl: noun("bowl", 9000),
  deck: noun("deck", 9000),
  imp: noun("imp", 100),
  sprite: noun("sprite", 100),
  wisp: noun("wisp", 100),
  club: noun("club", 5000),
  sword: noun("sword", 5000),
  staff: noun("staff", 5000),
  shield: noun("shield", 5000),
  spear: noun("spear", 5000),
  axe: noun("axe", 5000),
  dagger: noun("dagger", 5000),
  jerkin: noun("jerkin", 5000),
  hauberk: noun("hauberk", 5000),
  robe: noun("robe", 5000),
  charm: noun("charm", 5000),
  talisman: noun("talisman", 5000),
  bead: noun("bead", 5000),
  idol: noun("idol", 5000),
  medallion: noun("medallion", 5000),
  path: noun("path", 10000),
  // Containers — the chance of finding cookies in jars is something to
  // look forward to — and the remains breaking them leaves behind
  // (decoration for now).
  jar: noun("jar", 5000),
  chest: noun("chest", 5000),
  crate: noun("crate", 5000),
  sack: noun("sack", 5000),
  barrel: noun("barrel", 5000),
  rack: noun("rack", 5000),
  cabinet: noun("cabinet", 5000),
  urn: noun("urn", 5000),
  basket: noun("basket", 5000),
  strongbox: noun("strongbox", 5000),
  // Path guards: breakable walls hiding side rooms and backward loops.
  wall: noun("wall", 5000),
  barricade: noun("barricade", 5000),
  // (rubble already exists among the theme decorations below.)
  ceramic_shards: noun("ceramic shards", 4000),
  scrap_wood: noun("scrap wood", 4000),
  torn_cloth: noun("torn cloth", 4000),
  red_cookie: noun("red cookie", 5000),
  blue_cookie: noun("blue cookie", 5000),
  rock: noun("rock", 10000),
  stone: noun("stone", 10000),
  boulder: noun("boulder", 10000),
  trail: noun("trail", 10000),
  opening: noun("opening", 10000),
  hole: noun("hole", 10000),
  chasm: noun("chasm", 10000),
  crack: noun("crack", 10000),
  room: noun("room", 10000),
  enclosure: noun("enclosure", 10000),
  tent: noun("tent", 10000),
  chamber: noun("chamber", 10000),
  dome: noun("dome", 10000),
  cavern: noun("cavern", 10000),
  grass: noun("grass", 10000),
  tree: noun("tree", 10000),
  stump: noun("stump", 10000),
  log: noun("log", 10000),
  clearing: noun("clearing", 10000),
  grove: noun("grove", 10000),
  thicket: noun("thicket", 10000),
  hall: noun("hall", 10000),
  courtyard: noun("courtyard", 10000),
  crypt: noun("crypt", 10000),
  gate: noun("gate", 10000),
  archway: noun("archway", 10000),
  corridor: noun("corridor", 10000),
  stair: noun("stair", 10000),
  rubble: noun("rubble", 10000),
  bones: noun("bones", 10000),
  brazier: noun("brazier", 10000),
  altar: noun("altar", 10000),
  pillar: noun("pillar", 10000),
  shrine: noun("shrine", 10000),
  sanctum: noun("sanctum", 10000),
  vault: noun("vault", 10000),
  hollow: adjective("hollow", 1000),
  // Boss drops sparkle: the reward that anticipation promised.
  sparkling: adjective("sparkling", 1000),
  tiny: adjective("tiny", 1000),
  small: adjective("small", 900),
  big: adjective("big", 900),
  huge: adjective("huge", 1000),
  leather: adjective("leather", 1000),
  training: adjective("training", 1000),
  scrying: adjective("scrying", 1000),
  fate: adjective("fate", 1000),
  bone: adjective("bone", 1000),
  skeletal: adjective("skeletal", 1000),
  zombie: adjective("zombie", 1000),
  vampiric: adjective("vampiric", 1000),
  ghostly: adjective("ghostly", 1000),
  fiery: adjective("fiery", 1000),
  icy: adjective("icy", 1000),
  rusty: adjective("rusty", 1000),
  gleaming: adjective("gleaming", 1000),
  ancient: adjective("ancient", 1000),
  mossy: adjective("mossy", 1000),
  crumbling: adjective("crumbling", 1000),
  smoldering: adjective("smoldering", 1000),
  frozen: adjective("frozen", 1000),
  crackling: adjective("crackling", 1000),
} satisfies Record<string, AppearanceFeatureAsset>;

export type AppearanceFeatureName = keyof typeof APPEARANCE_FEATURES;

/** Client-only language vocabulary, like ACTION_APPEARANCES: the possessive
 * pronoun for each PERSON noun ("their" until an entity carries a gender —
 * then "her"/"his" entries appear here). Anything unlisted is a thing or a
 * beast: "its". */
import type { PossessivePronoun } from "../domain/appearance";

const PERSON_POSSESSIVES: Partial<
  Record<AppearanceFeatureName, PossessivePronoun>
> = {
  human: "their",
  bandit: "their",
};

const possessiveByNounText = new Map<string, PossessivePronoun>(
  Object.entries(PERSON_POSSESSIVES).map(([name, possessive]) => [
    APPEARANCE_FEATURES[name as AppearanceFeatureName].text,
    possessive,
  ]),
);

export const possessiveForNoun = (noun: string | null): PossessivePronoun =>
  (noun != null ? possessiveByNounText.get(noun) : undefined) ?? "its";
