import { AppearanceFeatureName } from "../../Game/assets/appearance_features";
import { PossessivePronoun } from "../../Game/domain/appearance";

/**
 * The en-US locale's rendering of the appearance-feature asset bundle.
 *
 * Display language lives HERE, in the locale — never in the assets or on the
 * wire. An asset key names a ROLE ("ceramic_shards", "zombieLike"); this module
 * decides how en-US renders that role ("ceramic shards", "zombie"). A key may
 * carry underscores as a lookup identifier; a rendered value must never show one
 * (guarded by appearanceFeatures.test.ts).
 *
 * Completeness is enforced by the COMPILER, not a test: this is a total
 * `Record<AppearanceFeatureName, string>`, so adding a feature without giving it
 * a word here is a type error. That is the "every asset can be rendered"
 * guarantee for this bundle.
 */
export const APPEARANCE_FEATURE_DISPLAY: Record<AppearanceFeatureName, string> =
  {
    human: "human",
    slime: "slime",
    bat: "bat",
    bandit: "bandit",
    wolf: "wolf",
    ogre: "ogre",
    rat: "rat",
    dummy: "dummy",
    dice: "dice",
    bowl: "bowl",
    deck: "deck",
    imp: "imp",
    sprite: "sprite",
    wisp: "wisp",
    club: "club",
    sword: "sword",
    staff: "staff",
    shield: "shield",
    spear: "spear",
    axe: "axe",
    dagger: "dagger",
    jerkin: "jerkin",
    hauberk: "hauberk",
    robe: "robe",
    charm: "charm",
    talisman: "talisman",
    bead: "bead",
    idol: "idol",
    medallion: "medallion",
    path: "path",
    jar: "jar",
    chest: "chest",
    crate: "crate",
    sack: "sack",
    barrel: "barrel",
    rack: "rack",
    cabinet: "cabinet",
    urn: "urn",
    basket: "basket",
    strongbox: "strongbox",
    wall: "wall",
    barricade: "barricade",
    ceramic_shards: "ceramic shards",
    scrap_wood: "scrap wood",
    torn_cloth: "torn cloth",
    debris: "debris",
    red_cookie: "red cookie",
    blue_cookie: "blue cookie",
    rock: "rock",
    stone: "stone",
    boulder: "boulder",
    trail: "trail",
    opening: "opening",
    hole: "hole",
    chasm: "chasm",
    crack: "crack",
    room: "room",
    enclosure: "enclosure",
    tent: "tent",
    campfire: "campfire",
    bedroll: "bedroll",
    banner: "banner",
    chamber: "chamber",
    dome: "dome",
    cavern: "cavern",
    grass: "grass",
    tree: "tree",
    stump: "stump",
    log: "log",
    clearing: "clearing",
    grove: "grove",
    thicket: "thicket",
    hall: "hall",
    courtyard: "courtyard",
    crypt: "crypt",
    gate: "gate",
    archway: "archway",
    corridor: "corridor",
    stair: "stair",
    rubble: "rubble",
    rock_wall: "rock wall",
    cave_mouth: "cave mouth",
    sky: "sky",
    bones: "bones",
    brazier: "brazier",
    altar: "altar",
    pillar: "pillar",
    shrine: "shrine",
    sanctum: "sanctum",
    vault: "vault",
    hollow: "hollow",
    sparkling: "sparkling",
    dark: "dark",
    bright: "bright",
    dim: "dim",
    winding: "winding",
    wide: "wide",
    narrow: "narrow",
    large: "large",
    hazy: "hazy",
    brawny: "brawny",
    rangy: "rangy",
    scrawny: "scrawny",
    scarred: "scarred",
    tiny: "tiny",
    small: "small",
    big: "big",
    huge: "huge",
    leather: "leather",
    chain: "chain",
    traveler: "traveler",
    ember: "ember",
    frost: "frost",
    storm: "storm",
    sun: "sun",
    training: "training",
    scrying: "scrying",
    fate: "fate",
    bone: "bone",
    skeleton: "skeleton",
    skeletal: "skeletal",
    zombie: "zombie",
    zombieLike: "zombie",
    vampiric: "vampiric",
    ghostly: "ghostly",
    fiery: "fiery",
    icy: "icy",
    rusty: "rusty",
    gleaming: "gleaming",
    notched: "notched",
    pitted: "pitted",
    ancient: "ancient",
    mossy: "mossy",
    crumbling: "crumbling",
    smoldering: "smoldering",
    frozen: "frozen",
    crackling: "crackling",
  };

/** The en-US word for an appearance-feature role key. */
export const appearanceFeatureDisplayOf = (
  name: AppearanceFeatureName,
): string => APPEARANCE_FEATURE_DISPLAY[name];

/**
 * en-US possessive pronoun for a defining NOUN role key: people get "their",
 * everything else "its" (until gendered features arrive, when "her"/"his"
 * entries appear here). Keyed by role KEY, not by rendered text.
 */
const PERSON_POSSESSIVES: Partial<
  Record<AppearanceFeatureName, PossessivePronoun>
> = {
  human: "their",
  bandit: "their",
};

export const possessiveForNoun = (nounKey: string | null): PossessivePronoun =>
  (nounKey != null
    ? PERSON_POSSESSIVES[nounKey as AppearanceFeatureName]
    : undefined) ?? "its";
