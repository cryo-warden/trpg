import {
  Layout,
  LocationMapAsset,
  LocationMapThemeAsset,
} from "../../stdb/types";
import { blob } from "./entity_blobs";

export const LOCATION_MAP_THEMES = {
  encampment: {
    decorationsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["rock"] }) },
        { weight: 4, blob: blob({ appearanceFeatureNames: ["stone"] }) },
      ],
    },
    minDecorationCount: 2,
    maxDecorationCount: 4,
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
  },
  keep: {
    // The armory of a fallen garrison: the item decorations here are the
    // armaments as scenery — pickup arrives with the inventory work.
    decorationsSelector: {
      selections: [
        { weight: 5, blob: blob({ appearanceFeatureNames: ["rubble"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["bones"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["brazier"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["rusty", "sword"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["rusty", "axe"] }) },
        { weight: 1, blob: blob({ appearanceFeatureNames: ["ancient", "shield"] }) },
        { weight: 1, blob: blob({ appearanceFeatureNames: ["club"] }) },
        { weight: 1, blob: blob({ appearanceFeatureNames: ["spear"] }) },
        { weight: 1, blob: blob({ appearanceFeatureNames: ["dagger"] }) },
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
  },
  sanctum: {
    decorationsSelector: {
      selections: [
        { weight: 4, blob: blob({ appearanceFeatureNames: ["pillar"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["smoldering", "brazier"] }) },
        { weight: 3, blob: blob({ appearanceFeatureNames: ["frozen", "altar"] }) },
        { weight: 2, blob: blob({ appearanceFeatureNames: ["crackling", "pillar"] }) },
        { weight: 1, blob: blob({ appearanceFeatureNames: ["gleaming", "staff"] }) },
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
  },
} satisfies Record<string, LocationMapThemeAsset>;

export type LocationMapThemeName = keyof typeof LOCATION_MAP_THEMES;

export const LOCATION_MAPS = {
  start_zone: {
    themeName: "encampment",
    layout: Layout.Hub,
    rngSeed: 0n,
    mainRoomCount: 10,
    extraRoomCount: 0,
    loopCount: 5,
    encounterNamesSampler: [],
    minEncounterCount: 0,
    maxEncounterCount: 0,
    connectionNames: ["beginner_cave", "verdant_meadow"],
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
    connectionNames: [],
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
    connectionNames: ["whispering_forest"],
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
    connectionNames: ["old_keep"],
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
    ],
    minEncounterCount: 6,
    maxEncounterCount: 9,
    connectionNames: ["elemental_sanctum"],
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
    connectionNames: [],
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
    connectionNames: [],
  },
} satisfies Record<string, LocationMapAsset>;

export type LocationMapName = keyof typeof LOCATION_MAPS;
