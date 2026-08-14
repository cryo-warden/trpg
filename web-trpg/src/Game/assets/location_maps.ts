import {
  EntityBlobAsset,
  Layout,
  LocationMapAsset,
  LocationMapConnectionAsset,
  LocationMapThemeAsset,
  QuestSpawnAsset,
} from "../../stdb/types";
import { blob } from "./entity_blobs";
import { QuestName } from "./quests";

// The visible checkpoints: fortune-telling scenery placed in every map's
// guaranteed-safe entrance room. Attuning to one binds where you wake from
// the death-trance.
const CHECKPOINT_BLOBS = {
  boneDice: blob({
    checkpointObject: {},
    appearanceFeatureNames: ["bone", "dice"],
  }),
  scryingBowl: blob({
    checkpointObject: {},
    appearanceFeatureNames: ["scrying", "bowl"],
  }),
  fateDeck: blob({
    checkpointObject: {},
    appearanceFeatureNames: ["fate", "deck"],
  }),
};

/** A breakable loot container: hp makes it smashable, remains turn the
 * debris into decoration, and the quest layer hides cookies inside. */
const container = (
  appearanceFeatureNames: string[],
  remainsAppearanceFeatureNames: string[],
): EntityBlobAsset =>
  blob({
    appearanceFeatureNames,
    remainsAppearanceFeatureNames,
    hp: {
      hp: 2,
      mhp: 2,
      defense: 0,
      accumulatedDamage: 0,
      accumulatedHealing: 0,
    },
  });

const jar = container(["jar"], ["ceramic_shards"]);
const crate = container(["crate"], ["scrap_wood"]);
const chest = container(["chest"], ["scrap_wood"]);

export const LOCATION_MAP_THEMES = {
  encampment: {
    // The training ground: dummies to hit (hp makes scenery attackable) and
    // an armory's worth of REAL practice gear to take and assign in the
    // loadout menu.
    decorationsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["rock"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["stone"] }) },
        {
          weight: 4,
          blob: blob({
            appearanceFeatureNames: ["training", "dummy"],
            hp: {
              hp: 10,
              mhp: 10,
              defense: 0,
              accumulatedDamage: 0,
              accumulatedHealing: 0,
            },
          }),
        },
        {
          weight: 2,
          blob: blob({
            appearanceFeatureNames: ["club"],
            item: { tag: "Armament", value: "club" },
          }),
        },
        {
          weight: 2,
          blob: blob({
            appearanceFeatureNames: ["sword"],
            item: { tag: "Armament", value: "sword" },
          }),
        },
        {
          weight: 2,
          blob: blob({
            appearanceFeatureNames: ["dagger"],
            item: { tag: "Armament", value: "dagger" },
          }),
        },
        {
          weight: 2,
          blob: blob({
            appearanceFeatureNames: ["shield"],
            item: { tag: "Armament", value: "shield" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["spear"],
            item: { tag: "Armament", value: "spear" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["axe"],
            item: { tag: "Armament", value: "axe" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["staff"],
            item: { tag: "Armament", value: "staff" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["leather", "jerkin"],
            item: { tag: "Armor", value: "leather_jerkin" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["smoldering", "charm"],
            item: { tag: "Relic", value: "ember_charm" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["crackling", "bead"],
            item: { tag: "Relic", value: "storm_bead" },
          }),
        },
      ],
    },
    minDecorationCount: 4,
    maxDecorationCount: 7,
    pathsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["trail"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["path"] }) },
      ],
    },
    roomsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["enclosure"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["tent"] }) },
      ],
    },
    checkpointsSelector: {
      selections: [{ weight: 1, blob: CHECKPOINT_BLOBS.boneDice }],
    },
    containersSelector: {
      selections: [
        { weight: 3, blob: crate },
        { weight: 1, blob: jar },
      ],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
  },
  cave: {
    decorationsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["rock"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["stone"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["boulder"] }) },
      ],
    },
    minDecorationCount: 2,
    maxDecorationCount: 4,
    pathsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["opening"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["hole"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["chasm"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["crack"] }) },
      ],
    },
    roomsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["chamber"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["dome"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["cavern"] }) },
      ],
    },
    checkpointsSelector: {
      selections: [{ weight: 1, blob: CHECKPOINT_BLOBS.boneDice }],
    },
    containersSelector: {
      selections: [
        { weight: 3, blob: jar },
        { weight: 1, blob: crate },
      ],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
  },
  meadow: {
    decorationsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["grass"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["stump"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["log"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["mossy", "rock"] }) },
      ],
    },
    minDecorationCount: 2,
    maxDecorationCount: 5,
    pathsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["trail"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["opening"] }) },
      ],
    },
    roomsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["clearing"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["grove"] }) },
      ],
    },
    checkpointsSelector: {
      selections: [{ weight: 1, blob: CHECKPOINT_BLOBS.scryingBowl }],
    },
    containersSelector: { selections: [{ weight: 1, blob: jar }] },
    minContainerCount: 1,
    maxContainerCount: 3,
  },
  forest: {
    decorationsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["tree"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["stump"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["log"] }) },
        { weight: 1, blob: blob({ appearanceFeatureNames: ["huge", "tree"] }) },
      ],
    },
    minDecorationCount: 3,
    maxDecorationCount: 6,
    pathsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["trail"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["opening"] }) },
      ],
    },
    roomsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["grove"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["thicket"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["clearing"] }) },
      ],
    },
    checkpointsSelector: {
      selections: [{ weight: 1, blob: CHECKPOINT_BLOBS.fateDeck }],
    },
    containersSelector: { selections: [{ weight: 1, blob: crate }] },
    minContainerCount: 1,
    maxContainerCount: 3,
  },
  keep: {
    // The armory of a fallen garrison: the gear here is REAL — every
    // armament-shaped decoration is a takeable item entity.
    decorationsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["rubble"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["bones"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["brazier"] }) },
        {
          weight: 2,
          blob: blob({
            appearanceFeatureNames: ["rusty", "sword"],
            item: { tag: "Armament", value: "sword" },
          }),
        },
        {
          weight: 2,
          blob: blob({
            appearanceFeatureNames: ["rusty", "axe"],
            item: { tag: "Armament", value: "axe" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["ancient", "shield"],
            item: { tag: "Armament", value: "shield" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["club"],
            item: { tag: "Armament", value: "club" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["spear"],
            item: { tag: "Armament", value: "spear" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["dagger"],
            item: { tag: "Armament", value: "dagger" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["leather", "jerkin"],
            item: { tag: "Armor", value: "leather_jerkin" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["rusty", "hauberk"],
            item: { tag: "Armor", value: "chain_hauberk" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["bone", "idol"],
            item: { tag: "Relic", value: "bone_idol" },
          }),
        },
      ],
    },
    minDecorationCount: 3,
    maxDecorationCount: 6,
    pathsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["archway"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["gate"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["corridor"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["crumbling", "stair"] }) },
      ],
    },
    roomsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["hall"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["courtyard"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["crypt"] }) },
      ],
    },
    checkpointsSelector: {
      selections: [{ weight: 1, blob: CHECKPOINT_BLOBS.fateDeck }],
    },
    containersSelector: {
      selections: [
        { weight: 3, blob: chest },
        { weight: 2, blob: crate },
      ],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
  },
  sanctum: {
    decorationsSelector: {
      selections: [
        { weight: 4, blob: blob({ appearanceFeatureNames: ["pillar"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["smoldering", "brazier"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["frozen", "altar"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["crackling", "pillar"] }) },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["gleaming", "staff"],
            item: { tag: "Armament", value: "staff" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["smoldering", "charm"],
            item: { tag: "Relic", value: "ember_charm" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["frozen", "talisman"],
            item: { tag: "Relic", value: "frost_talisman" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["crackling", "bead"],
            item: { tag: "Relic", value: "storm_bead" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["gleaming", "medallion"],
            item: { tag: "Relic", value: "sun_medallion" },
          }),
        },
        {
          weight: 1,
          blob: blob({
            appearanceFeatureNames: ["ancient", "robe"],
            item: { tag: "Armor", value: "traveler_robe" },
          }),
        },
      ],
    },
    minDecorationCount: 2,
    maxDecorationCount: 5,
    pathsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["archway"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["stair"] }) },
      ],
    },
    roomsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["shrine"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["sanctum"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["vault"] }) },
      ],
    },
    checkpointsSelector: {
      selections: [{ weight: 1, blob: CHECKPOINT_BLOBS.scryingBowl }],
    },
    containersSelector: {
      selections: [
        { weight: 2, blob: jar },
        { weight: 1, blob: chest },
      ],
    },
    minContainerCount: 1,
    maxContainerCount: 3,
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

const COOKIE_APPEARANCES: Record<QuestName, string[]> = {
  red_cookies: ["red_cookie"],
  blue_cookies: ["blue_cookie"],
};

const cookieBlob = (questName: QuestName): EntityBlobAsset =>
  blob({ appearanceFeatureNames: COOKIE_APPEARANCES[questName] });

/** Both cookie quests ride the same window in every map: red for mhp,
 * blue for mep, discovered the same way. */
const cookieSpawns = (window: CookieWindow): QuestSpawnAsset[] =>
  (["red_cookies", "blue_cookies"] as const).map((questName) => ({
    questName,
    itemBlob: cookieBlob(questName),
    ...window,
  }));

export const LOCATION_MAPS = {
  start_zone: {
    themeName: "encampment",
    layout: Layout.Hub,
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
    // The overlapping-window progression: each map guarantees a couple of
    // its own cookie bits and MAY spawn its neighbors' — most of the
    // supply spreads across the world, duplicates included.
    questSpawns: cookieSpawns({
      guaranteedIndexes: [0, 1],
      eligibleIndexes: [2, 3, 4],
      minEligibleCount: 1,
      maxEligibleCount: 3,
    }),
  },
  beginner_cave: {
    themeName: "cave",
    layout: Layout.Path,
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
    questSpawns: cookieSpawns({
      guaranteedIndexes: [2, 3],
      eligibleIndexes: [0, 1, 4, 5],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
  },
  verdant_meadow: {
    themeName: "meadow",
    layout: Layout.Hub,
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
    questSpawns: cookieSpawns({
      guaranteedIndexes: [4, 5],
      eligibleIndexes: [0, 1, 2, 3, 6],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
  },
  whispering_forest: {
    themeName: "forest",
    layout: Layout.Path,
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
    questSpawns: cookieSpawns({
      guaranteedIndexes: [6, 7],
      eligibleIndexes: [0, 1, 2, 3, 4, 5, 8],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
  },
  old_keep: {
    themeName: "keep",
    layout: Layout.Hub,
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
    questSpawns: cookieSpawns({
      guaranteedIndexes: [8],
      eligibleIndexes: [0, 1, 2, 3, 4, 5, 6, 7],
      minEligibleCount: 1,
      maxEligibleCount: 4,
    }),
  },
  elemental_sanctum: {
    themeName: "sanctum",
    layout: Layout.Path,
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
    questSpawns: cookieSpawns({
      guaranteedIndexes: [9],
      eligibleIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      minEligibleCount: 2,
      maxEligibleCount: 5,
    }),
  },
  triangle_loop: {
    // Smallest case that produces a triangular join: three main rooms chained
    // 0-1-2, plus one loop that adds the closing 0-2 edge to form a triangle.
    themeName: "cave",
    layout: Layout.Path,
    rngSeed: 0n,
    mainRoomCount: 3,
    extraRoomCount: 0,
    loopCount: 1,
    encounterNamesSampler: [],
    minEncounterCount: 0,
    maxEncounterCount: 0,
    // The demo loop guarantees nothing; wanderers may still luck into
    // spare cookies from anywhere in the supply.
    questSpawns: cookieSpawns({
      guaranteedIndexes: [],
      eligibleIndexes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      minEligibleCount: 0,
      maxEligibleCount: 3,
    }),
  },
} satisfies Record<string, LocationMapAsset>;

export type LocationMapName = keyof typeof LOCATION_MAPS;

// The world graph: a JOIN list, directed with both-ways expansion at push.
// Paths materialize lazily — a player standing in the anchor room demands
// the far map into existence.
const connect = (
  exit: LocationMapName,
  exitAnchor: LocationMapConnectionAsset["exitAnchor"]["tag"],
  destination: LocationMapName,
  destinationAnchor: LocationMapConnectionAsset["destinationAnchor"]["tag"],
): LocationMapConnectionAsset => ({
  exitLocationMapName: exit,
  destinationLocationMapName: destination,
  exitAnchor: { tag: exitAnchor },
  destinationAnchor: { tag: destinationAnchor },
  bothWays: true,
});

export const LOCATION_MAP_CONNECTIONS: LocationMapConnectionAsset[] = [
  connect("start_zone", "Branch", "beginner_cave", "Entrance"),
  connect("start_zone", "Ending", "verdant_meadow", "Entrance"),
  connect("verdant_meadow", "Ending", "whispering_forest", "Entrance"),
  connect("whispering_forest", "Ending", "old_keep", "Entrance"),
  connect("old_keep", "Ending", "elemental_sanctum", "Entrance"),
  // The triangular-join demo hangs off the cave's far end: EVERY authored
  // map must be reachable (location_maps.test.ts enforces it).
  connect("beginner_cave", "Ending", "triangle_loop", "Entrance"),
];
