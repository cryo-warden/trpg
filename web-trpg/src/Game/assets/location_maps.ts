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
    connectionNames: [],
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
