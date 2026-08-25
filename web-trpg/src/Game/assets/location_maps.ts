import {
  EntityBlobAsset,
  Layout,
  LocationMapAsset,
  LocationMapConnectionAsset,
  LocationMapThemeAsset,
  PathBlobPairAsset,
  QuestRoomRole,
  QuestSpawnAsset,
  ZoneKind,
} from "../../stdb/types";
import { blob } from "./entity_blobs";
import { ActionName } from "./actions";
import { AppearanceFeatureName } from "./appearance_features";
import { ARMAMENTS } from "./armaments";
import { ARMORS } from "./armors";
import { BaselineName } from "./baselines";
import { RELICS } from "./relics";
import { TraitName } from "./traits";
import { gearLoot } from "./gear";
import { QuestName } from "./quests";

/** A physical object's toughness, as an hp component. Anything physical can
 * break if you hit it hard enough — but a non-actor's HP bar stays hidden
 * until it is actually struck (see HPBar), so this clutters nothing. Scenery
 * takes its durability from its baseline; a container (a distinct breakable
 * with remains) authors it directly through this. */
const durability = (mhp: number, defense: number): EntityBlobAsset["hp"] => ({
  hp: mhp,
  mhp,
  defense,
  accumulatedDamage: 0,
  accumulatedHealing: 0,
});

/** A breakable loot container: FLIMSY hit points make it smashable, remains
 * turn the debris into decoration, and the quest layer hides cookies inside.
 * offeredActionNames are the GENTLE interactions this container itself
 * offers to anyone beside it — a lidded chest opens, a sack tips over —
 * explicit per container, never inferred from its look. Smashing always
 * remains an option. */
const container = (
  appearanceFeatureNames: AppearanceFeatureName[],
  remainsAppearanceFeatureNames: AppearanceFeatureName[],
  offeredActionNames?: ActionName[],
): EntityBlobAsset =>
  blob({
    appearanceFeatureNames,
    remainsAppearanceFeatureNames,
    offeredActionNames,
    // Flimsy, but with a point of defense like any object.
    hp: durability(2, 1),
  });

/** A path presentation, OFFERING its crossing verbs: movement belongs to
 * the path, not the walker — a crack offers squeeze, a chasm climb_down,
 * everything else the plain move. No body knows "move" innately.
 *
 * A path takes its whole look through the stat pipeline: its noun is a
 * BASELINE and its adjectives are TRAITS, exactly like a creature is a body
 * plus traits. Generation then adds rolled variation traits on top; the
 * pipeline OVERWRITES its look from baseline + all traits. The baseline gives
 * it high HP and defense — a physical crossing you can collapse only with real
 * force — and generation links paired directions so they share that fate. */
const pathBlob = (
  baselineName: BaselineName,
  offeredActionNames: ActionName[] = ["move"],
  traitNames?: TraitName[],
): EntityBlobAsset =>
  blob({
    baselineName,
    offeredActionNames,
    traitNames,
  });

/** Every map's rooms nest into the world's open air via its
 * roomLocation field: EXTERIOR maps see the sky through the edge chain;
 * INTERIOR maps nest without the view. */
const OUTDOOR: LocationMapAsset["roomLocation"] = {
  locationName: "world_surface",
  kind: { tag: "Exterior" },
};
const INDOOR: LocationMapAsset["roomLocation"] = {
  locationName: "world_surface",
  kind: { tag: "Interior" },
};

/** The shared palette of optional path-variation TRAITS rolled onto paths at
 * generation, with a weighted count: mostly one, rarely two, almost never
 * three, occasionally none. Global for now — every theme draws the same set;
 * a theme (or map) can override later. Exclusion groups on the traits'
 * features keep a roll from pairing opposites/redundants (wide+narrow,
 * dim+dark). Each name is a TRAIT (see traits.ts), surfaced through the
 * path's baseline+traits pipeline. */
const PATH_VARIATION_TRAIT_NAMES: TraitName[] = [
  "winding",
  "wide",
  "narrow",
  "large",
  "bright",
  "dim",
  "dark",
  "hazy",
];
const PATH_VARIATION_COUNT_WEIGHTS = new Uint8Array([10, 75, 12, 3]);

/** A loot decoration: a takeable item entity placed among the scenery, built
 * from a gear template plus a fresh look (see {@link gearLoot}). */
const loot = gearLoot;

/** EVERY location-map blob TEMPLATE, formerly inline in the theme selectors,
 * map quest spawns, and connections — now named so it can live in the single
 * unified entity-blob table (see bundle/entityBlobs). A blob reused across
 * themes (jar, a trail path, a checkpoint) is ONE entry referenced by name from
 * every use. Behavior is unchanged: the same blobs, wired the same way. */
export const LOCATION_MAP_BLOBS = {
  // The visible checkpoints: fortune-telling scenery placed in every map's
  // guaranteed-safe entrance room. Attuning to one binds where you wake from
  // the death-trance.
  bone_dice: blob({
    checkpointObject: {},
    appearanceFeatureNames: ["bone", "dice"],
  }),
  scrying_bowl: blob({
    checkpointObject: {},
    appearanceFeatureNames: ["scrying", "bowl"],
  }),
  fate_deck: blob({
    checkpointObject: {},
    appearanceFeatureNames: ["fate", "deck"],
  }),

  // Breakable loot containers, reused across themes.
  jar: container(["jar"], ["ceramic_shards"]),
  urn: container(["urn"], ["ceramic_shards"], ["dump"]),
  crate: container(["crate"], ["scrap_wood"]),
  chest: container(["chest"], ["scrap_wood"], ["open"]),
  barrel: container(["barrel"], ["scrap_wood"], ["open", "dump"]),
  rack: container(["rack"], ["scrap_wood"]),
  cabinet: container(["cabinet"], ["scrap_wood"], ["open"]),
  strongbox: container(["strongbox"], ["scrap_wood"], ["open"]),
  basket: container(["basket"], ["scrap_wood"], ["dump"]),
  sack: container(["sack"], ["torn_cloth"], ["dump"]),
  hollow_stump: container(["hollow", "stump"], ["scrap_wood"]),
  hollow_log: container(["hollow", "log"], ["scrap_wood"]),

  // Path guards: the same breakable shape, standing in for a blocked way.
  boulder_guard: container(["boulder"], ["rubble"]),
  barricade_guard: container(["barricade"], ["scrap_wood"]),
  thicket_guard: container(["thicket"], ["scrap_wood"]),
  crumbling_wall_guard: container(["crumbling", "wall"], ["rubble"]),
  crumbling_pillar_guard: container(["crumbling", "pillar"], ["rubble"]),

  // Path presentations, reused across themes where identical.
  path_trail: pathBlob("trail"),
  path_path: pathBlob("path"),
  path_opening: pathBlob("opening"),
  path_hole: pathBlob("hole"),
  path_chasm: pathBlob("chasm", ["climb_down"]),
  path_rock_wall: pathBlob("rock_wall", ["climb_up"]),
  path_crack: pathBlob("crack", ["squeeze"]),
  path_archway: pathBlob("archway"),
  path_gate: pathBlob("gate"),
  path_corridor: pathBlob("corridor"),
  path_stair_down: pathBlob("stair", ["climb_down"], ["crumbling"]),
  path_stair_up: pathBlob("stair", ["climb_up"], ["crumbling"]),
  path_stair: pathBlob("stair"),
  path_cave_mouth_dark: pathBlob("cave_mouth", ["move"], ["dark"]),
  path_cave_mouth_bright: pathBlob("cave_mouth", ["move"], ["bright"]),

  // Rooms, reused across themes where identical (grove/clearing).
  room_enclosure: blob({ appearanceFeatureNames: ["enclosure"] }),
  room_tent: blob({ appearanceFeatureNames: ["tent"] }),
  room_chamber: blob({ appearanceFeatureNames: ["chamber"] }),
  room_dome: blob({ appearanceFeatureNames: ["dome"] }),
  room_cavern: blob({ appearanceFeatureNames: ["cavern"] }),
  room_clearing: blob({ appearanceFeatureNames: ["clearing"] }),
  room_grove: blob({ appearanceFeatureNames: ["grove"] }),
  room_thicket: blob({ appearanceFeatureNames: ["thicket"] }),
  room_hall: blob({ appearanceFeatureNames: ["hall"] }),
  room_courtyard: blob({ appearanceFeatureNames: ["courtyard"] }),
  room_crypt: blob({ appearanceFeatureNames: ["crypt"] }),
  room_shrine: blob({ appearanceFeatureNames: ["shrine"] }),
  room_sanctum: blob({ appearanceFeatureNames: ["sanctum"] }),
  room_vault: blob({ appearanceFeatureNames: ["vault"] }),

  // Scenery decorations (baseline noun, optional variation trait).
  campfire: blob({ baselineName: "campfire" }),
  bedroll: blob({ baselineName: "bedroll" }),
  banner: blob({ baselineName: "banner" }),
  training_dummy: blob({ baselineName: "dummy", traitNames: ["training"] }),
  rock: blob({ baselineName: "rock" }),
  stone: blob({ baselineName: "stone" }),
  boulder: blob({ baselineName: "boulder" }),
  grass: blob({ baselineName: "grass" }),
  stump: blob({ baselineName: "stump" }),
  log: blob({ baselineName: "log" }),
  mossy_rock: blob({ baselineName: "rock", traitNames: ["mossy"] }),
  tree: blob({ baselineName: "tree" }),
  huge_tree: blob({ baselineName: "tree", traitNames: ["huge"] }),
  rubble: blob({ baselineName: "rubble" }),
  bones: blob({ baselineName: "bones" }),
  brazier: blob({ baselineName: "brazier" }),
  pillar: blob({ baselineName: "pillar" }),
  smoldering_brazier: blob({ baselineName: "brazier", traitNames: ["smoldering"] }),
  frozen_altar: blob({ baselineName: "altar", traitNames: ["frozen"] }),
  crackling_pillar: blob({ baselineName: "pillar", traitNames: ["crackling"] }),

  // Loot decorations: REAL takeable gear item entities. A look reused across
  // themes (a plain club, a smoldering charm) is ONE entry.
  loot_club: loot(ARMAMENTS.club, { appearanceFeatureNames: ["club"] }),
  loot_sword: loot(ARMAMENTS.sword, {
    // A differentiable item takes its whole look through the pipeline: the noun
    // is a baseline (max HP 0 → no HP), the rolled condition a trait.
    baselineName: "sword",
    differentiable: { traitPaletteName: "weapon_variety" },
  }),
  loot_dagger: loot(ARMAMENTS.dagger, { appearanceFeatureNames: ["dagger"] }),
  loot_shield: loot(ARMAMENTS.shield, {
    baselineName: "shield",
    differentiable: { traitPaletteName: "weapon_variety" },
  }),
  loot_spear: loot(ARMAMENTS.spear, { appearanceFeatureNames: ["spear"] }),
  loot_axe: loot(ARMAMENTS.axe, { appearanceFeatureNames: ["axe"] }),
  loot_staff: loot(ARMAMENTS.staff, {
    baselineName: "staff",
    differentiable: { traitPaletteName: "weapon_variety" },
  }),
  loot_leather_jerkin: loot(ARMORS.leather_jerkin, {
    appearanceFeatureNames: ["leather", "jerkin"],
  }),
  loot_ember_charm: loot(RELICS.ember_charm, {
    appearanceFeatureNames: ["smoldering", "charm"],
  }),
  loot_storm_bead: loot(RELICS.storm_bead, {
    appearanceFeatureNames: ["crackling", "bead"],
  }),
  loot_rusty_sword: loot(ARMAMENTS.sword, {
    appearanceFeatureNames: ["rusty", "sword"],
  }),
  loot_rusty_axe: loot(ARMAMENTS.axe, {
    appearanceFeatureNames: ["rusty", "axe"],
  }),
  loot_ancient_shield: loot(ARMAMENTS.shield, {
    appearanceFeatureNames: ["ancient", "shield"],
  }),
  loot_rusty_hauberk: loot(ARMORS.chain_hauberk, {
    appearanceFeatureNames: ["rusty", "hauberk"],
  }),
  loot_bone_idol: loot(RELICS.bone_idol, {
    appearanceFeatureNames: ["bone", "idol"],
  }),
  loot_gleaming_staff: loot(ARMAMENTS.staff, {
    appearanceFeatureNames: ["gleaming", "staff"],
  }),
  loot_frost_talisman: loot(RELICS.frost_talisman, {
    appearanceFeatureNames: ["frozen", "talisman"],
  }),
  loot_sun_medallion: loot(RELICS.sun_medallion, {
    appearanceFeatureNames: ["gleaming", "medallion"],
  }),
  loot_traveler_robe: loot(ARMORS.traveler_robe, {
    appearanceFeatureNames: ["ancient", "robe"],
  }),

  // Quest cookies: the window-spawned pair, plus the boss's sparkling drop.
  cookie_red: blob({ appearanceFeatureNames: ["red_cookie"] }),
  cookie_blue: blob({ appearanceFeatureNames: ["blue_cookie"] }),
  sparkling_red_cookie: blob({
    appearanceFeatureNames: ["sparkling", "red_cookie"],
  }),
} satisfies Record<string, EntityBlobAsset>;

export type LocationMapBlobName = keyof typeof LOCATION_MAP_BLOBS;

/** A weighted blob selection, referencing a named location-map blob. Used by
 * the decoration/room/checkpoint/container/blocker selectors. */
const sel = (weight: number, blobName: LocationMapBlobName) => ({
  weight,
  blobName,
});

/** A MATCHED pair of path presentations by name: the two directions between two
 * rooms are one authored fact — an opening pairs with an opening, a chasm with
 * the rock wall climbed back up. Omit `backwardName` for the symmetric case. */
const pathPairNames = (
  forwardName: LocationMapBlobName,
  backwardName: LocationMapBlobName = forwardName,
): PathBlobPairAsset => ({ forwardName, backwardName });

/** A weighted path-pair selection for a theme's pathsSelector. */
const pathSel = (
  weight: number,
  forwardName: LocationMapBlobName,
  backwardName?: LocationMapBlobName,
) => ({ weight, pair: pathPairNames(forwardName, backwardName) });

export const LOCATION_MAP_THEMES = {
  encampment: {
    // The training ground: dummies to hit (hp makes scenery attackable) and
    // an armory's worth of REAL practice gear to take and assign in the
    // customization menu.
    decorationsSelector: {
      selections: [
        // Camp scenery, not cave rubble: the exterior training ground reads
        // as a camp.
        sel(5, "campfire"),
        sel(3, "bedroll"),
        sel(2, "banner"),
        sel(4, "training_dummy"),
        sel(2, "loot_club"),
        sel(2, "loot_sword"),
        sel(2, "loot_dagger"),
        sel(2, "loot_shield"),
        sel(1, "loot_spear"),
        sel(1, "loot_axe"),
        sel(1, "loot_staff"),
        sel(1, "loot_leather_jerkin"),
        sel(1, "loot_ember_charm"),
        sel(1, "loot_storm_bead"),
      ],
    },
    minDecorationCount: 4,
    maxDecorationCount: 7,
    pathsSelector: {
      selections: [pathSel(5, "path_trail"), pathSel(4, "path_path")],
    },
    roomsSelector: {
      selections: [sel(5, "room_enclosure"), sel(4, "room_tent")],
    },
    checkpointsSelector: {
      selections: [sel(1, "bone_dice")],
    },
    containersSelector: {
      selections: [
        sel(3, "crate"),
        sel(3, "barrel"),
        sel(2, "rack"),
        sel(2, "sack"),
        sel(1, "jar"),
      ],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
    blockersSelector: { selections: [sel(1, "barricade_guard")] },
    pathVariationTraitNames: PATH_VARIATION_TRAIT_NAMES,
    pathVariationCountWeights: PATH_VARIATION_COUNT_WEIGHTS,
  },
  cave: {
    decorationsSelector: {
      selections: [sel(5, "rock"), sel(4, "stone"), sel(2, "boulder")],
    },
    minDecorationCount: 2,
    maxDecorationCount: 4,
    pathsSelector: {
      selections: [
        pathSel(5, "path_opening"),
        pathSel(4, "path_hole"),
        // The verbs the player squeezes and climbs by: different paths,
        // different crossings, different messages — and the chasm's far
        // side is the ROCK WALL you climb back up, one authored fact.
        pathSel(2, "path_chasm", "path_rock_wall"),
        pathSel(2, "path_crack"),
      ],
    },
    roomsSelector: {
      selections: [
        sel(5, "room_chamber"),
        sel(4, "room_dome"),
        sel(2, "room_cavern"),
      ],
    },
    checkpointsSelector: {
      selections: [sel(1, "bone_dice")],
    },
    containersSelector: {
      selections: [sel(3, "jar"), sel(2, "urn"), sel(1, "crate")],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
    blockersSelector: { selections: [sel(1, "boulder_guard")] },
    pathVariationTraitNames: PATH_VARIATION_TRAIT_NAMES,
    pathVariationCountWeights: PATH_VARIATION_COUNT_WEIGHTS,
  },
  meadow: {
    decorationsSelector: {
      selections: [
        sel(5, "grass"),
        sel(3, "stump"),
        sel(2, "log"),
        sel(2, "mossy_rock"),
      ],
    },
    minDecorationCount: 2,
    maxDecorationCount: 5,
    pathsSelector: {
      selections: [pathSel(5, "path_trail"), pathSel(3, "path_opening")],
    },
    roomsSelector: {
      selections: [sel(5, "room_clearing"), sel(3, "room_grove")],
    },
    checkpointsSelector: {
      selections: [sel(1, "scrying_bowl")],
    },
    containersSelector: {
      selections: [sel(3, "hollow_stump"), sel(2, "basket"), sel(1, "jar")],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
    blockersSelector: { selections: [sel(1, "thicket_guard")] },
    pathVariationTraitNames: PATH_VARIATION_TRAIT_NAMES,
    pathVariationCountWeights: PATH_VARIATION_COUNT_WEIGHTS,
  },
  forest: {
    decorationsSelector: {
      selections: [
        sel(5, "tree"),
        sel(3, "stump"),
        sel(3, "log"),
        sel(1, "huge_tree"),
      ],
    },
    minDecorationCount: 3,
    maxDecorationCount: 6,
    pathsSelector: {
      selections: [pathSel(5, "path_trail"), pathSel(3, "path_opening")],
    },
    roomsSelector: {
      selections: [
        sel(5, "room_grove"),
        sel(4, "room_thicket"),
        sel(2, "room_clearing"),
      ],
    },
    checkpointsSelector: {
      selections: [sel(1, "fate_deck")],
    },
    containersSelector: {
      selections: [
        sel(3, "hollow_log"),
        sel(2, "hollow_stump"),
        sel(1, "basket"),
        sel(1, "crate"),
      ],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
    blockersSelector: { selections: [sel(1, "thicket_guard")] },
    pathVariationTraitNames: PATH_VARIATION_TRAIT_NAMES,
    pathVariationCountWeights: PATH_VARIATION_COUNT_WEIGHTS,
  },
  keep: {
    // The armory of a fallen garrison: the gear here is REAL — every
    // armament-shaped decoration is a takeable item entity.
    decorationsSelector: {
      selections: [
        sel(5, "rubble"),
        sel(3, "bones"),
        sel(2, "brazier"),
        sel(2, "loot_rusty_sword"),
        sel(2, "loot_rusty_axe"),
        sel(1, "loot_ancient_shield"),
        sel(1, "loot_club"),
        sel(1, "loot_spear"),
        sel(1, "loot_dagger"),
        sel(1, "loot_leather_jerkin"),
        sel(1, "loot_rusty_hauberk"),
        sel(1, "loot_bone_idol"),
      ],
    },
    minDecorationCount: 3,
    maxDecorationCount: 6,
    pathsSelector: {
      selections: [
        pathSel(5, "path_archway"),
        pathSel(3, "path_gate"),
        pathSel(3, "path_corridor"),
        // Stairs go two ways: descend forward, climb the same crumbling
        // stair back up — one authored fact, opposite verbs (like the
        // chasm/rock-wall pair).
        pathSel(2, "path_stair_down", "path_stair_up"),
      ],
    },
    roomsSelector: {
      selections: [
        sel(5, "room_hall"),
        sel(3, "room_courtyard"),
        sel(2, "room_crypt"),
      ],
    },
    checkpointsSelector: {
      selections: [sel(1, "fate_deck")],
    },
    containersSelector: {
      selections: [
        sel(3, "chest"),
        sel(2, "cabinet"),
        sel(2, "barrel"),
        sel(1, "strongbox"),
        sel(1, "crate"),
      ],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
    blockersSelector: {
      selections: [sel(1, "crumbling_wall_guard")],
    },
    pathVariationTraitNames: PATH_VARIATION_TRAIT_NAMES,
    pathVariationCountWeights: PATH_VARIATION_COUNT_WEIGHTS,
  },
  sanctum: {
    decorationsSelector: {
      selections: [
        sel(4, "pillar"),
        sel(3, "smoldering_brazier"),
        sel(3, "frozen_altar"),
        sel(2, "crackling_pillar"),
        sel(1, "loot_gleaming_staff"),
        sel(1, "loot_ember_charm"),
        sel(1, "loot_frost_talisman"),
        sel(1, "loot_storm_bead"),
        sel(1, "loot_sun_medallion"),
        sel(1, "loot_traveler_robe"),
      ],
    },
    minDecorationCount: 2,
    maxDecorationCount: 5,
    pathsSelector: {
      selections: [pathSel(5, "path_archway"), pathSel(3, "path_stair")],
    },
    roomsSelector: {
      selections: [
        sel(5, "room_shrine"),
        sel(3, "room_sanctum"),
        sel(2, "room_vault"),
      ],
    },
    checkpointsSelector: {
      selections: [sel(1, "scrying_bowl")],
    },
    containersSelector: {
      selections: [sel(3, "urn"), sel(2, "jar"), sel(1, "chest")],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
    blockersSelector: {
      selections: [sel(1, "crumbling_pillar_guard")],
    },
    pathVariationTraitNames: PATH_VARIATION_TRAIT_NAMES,
    pathVariationCountWeights: PATH_VARIATION_COUNT_WEIGHTS,
  },
} satisfies Record<string, LocationMapThemeAsset>;

export type LocationMapThemeName = keyof typeof LOCATION_MAP_THEMES;

/** One quest's window of bit indexes in one map. Guaranteed indexes are
 * unique to that map (push refuses a bit guaranteed twice); eligible
 * windows overlap across maps on purpose — the same index spawning in two
 * maps is the intended duplicate, stinky to whoever already ate it. Counts
 * are half-open like the other count ranges. */
interface CookieWindow {
  guaranteedIndexes: number[];
  eligibleIndexes: number[];
  minEligibleCount: number;
  maxEligibleCount: number;
}

/** The window-spawned quests: only these hide in jars; boss quests link
 * rooms instead. */
type CookieQuestName = Extract<QuestName, "red_cookies" | "blue_cookies">;

/** The named cookie blob each window quest spawns (see LOCATION_MAP_BLOBS). */
const COOKIE_BLOB_NAMES: Record<CookieQuestName, LocationMapBlobName> = {
  red_cookies: "cookie_red",
  blue_cookies: "cookie_blue",
};

/** Both cookie quests ride the same window in every map: red for mhp,
 * blue for mep, discovered the same way. */
const cookieSpawns = (window: CookieWindow): QuestSpawnAsset[] =>
  (["red_cookies", "blue_cookies"] as const).map((questName) => ({
    questName,
    itemBlobName: COOKIE_BLOB_NAMES[questName],
    ...window,
  }));

export const LOCATION_MAPS = {
  start_zone: {
    themeName: "encampment",
    layout: Layout.Hub,
    zoneKind: ZoneKind.Private,
    rngSeed: 0n,
    mainRoomCount: 10,
    extraRoomCount: 0,
    loopCount: 5,
    // The tutorial bestiary: rats break when the player so much as moves
    // near them (intimidation from the strong side); the wandering ogre
    // breaks the PLAYER (the rally-or-flee lesson, survivably).
    encounterNamesSampler: [
      { weight: 5, name: "rat_pair" },
      { weight: 3, name: "rat_swarm" },
      { weight: 2, name: "ogre1" },
    ],
    minEncounterCount: 2,
    maxEncounterCount: 4,
    // The tutorial zone hides nothing: no extras, no guarded rooms.
    minHiddenRoomCount: 0,
    maxHiddenRoomCount: 0,
    // The overlapping-window progression: each map guarantees a couple of
    // its own cookie bits and MAY spawn its neighbors' — most of the
    // supply spreads across the world, duplicates included.
    questSpawns: cookieSpawns({
      guaranteedIndexes: [0, 1],
      eligibleIndexes: [2, 3, 4],
      minEligibleCount: 1,
      maxEligibleCount: 3,
    }),
    questRoomClaims: [],
    roomLocation: OUTDOOR,
  },
  beginner_cave: {
    themeName: "cave",
    layout: Layout.Path,
    zoneKind: ZoneKind.Private,
    rngSeed: 0n,
    mainRoomCount: 10,
    extraRoomCount: 10,
    loopCount: 5,
    encounterNamesSampler: [
      { weight: 5, name: "slime2" },
      { weight: 5, name: "slime3" },
      { weight: 3, name: "slime4" },
      { weight: 1, name: "slime2_bat1" },
    ],
    minEncounterCount: 8,
    maxEncounterCount: 12,
    minHiddenRoomCount: 1,
    maxHiddenRoomCount: 4,
    questSpawns: cookieSpawns({
      guaranteedIndexes: [2, 3],
      eligibleIndexes: [0, 1, 4, 5],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
    questRoomClaims: [],
    roomLocation: INDOOR,
  },
  verdant_meadow: {
    themeName: "meadow",
    layout: Layout.Hub,
    zoneKind: ZoneKind.Private,
    rngSeed: 0n,
    mainRoomCount: 8,
    extraRoomCount: 4,
    loopCount: 3,
    encounterNamesSampler: [
      { weight: 5, name: "wolf1" },
      { weight: 4, name: "wolf2" },
      { weight: 3, name: "slime2" },
      { weight: 2, name: "wolf1_slime1" },
    ],
    minEncounterCount: 5,
    maxEncounterCount: 8,
    minHiddenRoomCount: 1,
    maxHiddenRoomCount: 3,
    questSpawns: cookieSpawns({
      guaranteedIndexes: [4, 5],
      eligibleIndexes: [0, 1, 2, 3, 6],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
    questRoomClaims: [],
    roomLocation: OUTDOOR,
  },
  whispering_forest: {
    themeName: "forest",
    layout: Layout.Path,
    zoneKind: ZoneKind.Private,
    rngSeed: 0n,
    mainRoomCount: 10,
    extraRoomCount: 6,
    loopCount: 4,
    encounterNamesSampler: [
      { weight: 5, name: "wolf2" },
      { weight: 3, name: "wolf_pack" },
      { weight: 3, name: "wolf1_bat2" },
      { weight: 2, name: "batBig1" },
    ],
    minEncounterCount: 6,
    maxEncounterCount: 10,
    minHiddenRoomCount: 1,
    maxHiddenRoomCount: 4,
    questSpawns: cookieSpawns({
      guaranteedIndexes: [6, 7],
      eligibleIndexes: [0, 1, 2, 3, 4, 5, 8],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
    questRoomClaims: [],
    roomLocation: OUTDOOR,
  },
  old_keep: {
    themeName: "keep",
    layout: Layout.Hub,
    zoneKind: ZoneKind.Private,
    rngSeed: 0n,
    mainRoomCount: 9,
    extraRoomCount: 5,
    loopCount: 4,
    encounterNamesSampler: [
      { weight: 5, name: "bandit_pair" },
      { weight: 3, name: "bandit_camp" },
      { weight: 4, name: "skeleton_watch" },
      { weight: 3, name: "skeleton_pair" },
      { weight: 2, name: "crypt_risen" },
      { weight: 1, name: "crypt_stalker" },
    ],
    minEncounterCount: 6,
    maxEncounterCount: 9,
    minHiddenRoomCount: 1,
    maxHiddenRoomCount: 3,
    questSpawns: cookieSpawns({
      guaranteedIndexes: [8],
      eligibleIndexes: [0, 1, 2, 3, 4, 5, 6, 7],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
    // The keep's far hall belongs to its warden — and the room at its door
    // holds a fortune-teller's checkpoint, so the challenge is always
    // approached from a save point. Felling the warden's whole retinue
    // DROPS one sparkling cookie per player present (+2 mhp when eaten):
    // a visible reward to pick up, not a silent stat bump.
    questRoomClaims: [
      {
        questName: "warden_of_the_keep",
        role: QuestRoomRole.Boss,
        encounterName: "keep_warden",
        spawnCheckpointBefore: true,
        defeatDrop: {
          questName: "warden_of_the_keep",
          index: 0,
          itemBlobName: "sparkling_red_cookie",
        },
      },
    ],
    roomLocation: INDOOR,
  },
  elemental_sanctum: {
    themeName: "sanctum",
    layout: Layout.Path,
    zoneKind: ZoneKind.Private,
    rngSeed: 0n,
    mainRoomCount: 7,
    extraRoomCount: 3,
    loopCount: 2,
    encounterNamesSampler: [
      { weight: 4, name: "fire_imp1" },
      { weight: 4, name: "ice_sprite1" },
      { weight: 4, name: "storm_wisp1" },
      { weight: 2, name: "elemental_trio" },
    ],
    minEncounterCount: 5,
    maxEncounterCount: 8,
    minHiddenRoomCount: 1,
    maxHiddenRoomCount: 3,
    questSpawns: cookieSpawns({
      guaranteedIndexes: [9],
      eligibleIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      minEligibleCount: 2,
      maxEligibleCount: 5,
    }),
    questRoomClaims: [],
    roomLocation: INDOOR,
  },
} satisfies Record<string, LocationMapAsset>;

export type LocationMapName = keyof typeof LOCATION_MAPS;

// The world graph: a JOIN list, directed with both-ways expansion at push.
// Paths materialize lazily — a player standing in the anchor room demands
// the far map into existence.
const connect = (
  {
    exit,
    exitAnchor,
    destination,
    destinationAnchor,
    pathPair: connectionPathPair,
  }: {
    exit: LocationMapName;
    exitAnchor: LocationMapConnectionAsset["exitAnchor"]["tag"];
    destination: LocationMapName;
    destinationAnchor: LocationMapConnectionAsset["destinationAnchor"]["tag"];
    /** Cross-map crossings are even more special: an authored pair
     * themed by BOTH endpoints (forward = the authored direction). */
    pathPair?: LocationMapConnectionAsset["pathPair"];
  },
): LocationMapConnectionAsset => ({
  exitLocationMapName: exit,
  destinationLocationMapName: destination,
  exitAnchor: { tag: exitAnchor },
  destinationAnchor: { tag: destinationAnchor },
  bothWays: true,
  pathPair: connectionPathPair,
});

export const LOCATION_MAP_CONNECTIONS: LocationMapConnectionAsset[] = [
  connect({
    exit: "start_zone",
    exitAnchor: "Branch",
    destination: "beginner_cave",
    destinationAnchor: "Entrance",
    // Themed by both endpoints: going in, a dark cave mouth; coming
    // back out, a bright one.
    pathPair: pathPairNames("path_cave_mouth_dark", "path_cave_mouth_bright"),
  }),
  connect({
    exit: "start_zone",
    exitAnchor: "Ending",
    destination: "verdant_meadow",
    destinationAnchor: "Entrance",
  }),
  connect({
    exit: "verdant_meadow",
    exitAnchor: "Ending",
    destination: "whispering_forest",
    destinationAnchor: "Entrance",
  }),
  connect({
    exit: "whispering_forest",
    exitAnchor: "Ending",
    destination: "old_keep",
    destinationAnchor: "Entrance",
  }),
  connect({
    exit: "old_keep",
    exitAnchor: "Ending",
    destination: "elemental_sanctum",
    destinationAnchor: "Entrance",
  }),
];
