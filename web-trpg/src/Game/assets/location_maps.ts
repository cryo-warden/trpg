import {
  EntityBlobSampleAuthor,
  EntityBlobsSamplerAuthor,
  Layout,
  LocationMapAuthor,
  LocationMapThemeAuthor,
} from "../../stdb/types";
import { EncountersSamplerAsset } from "./encounters";
import { EntityBlobAsset, getEntityBlobAuthor } from "./entity_blobs";

export type EntityBlobSampleAsset = {
  blob: EntityBlobAsset;
} & Omit<EntityBlobSampleAuthor, "blob">;

export type EntityBlobsSamplerAsset = EntityBlobSampleAsset[];

export const getEntityBlobsSampler = (
  asset: EntityBlobsSamplerAsset,
): EntityBlobsSamplerAuthor => {
  return {
    selections: asset.map((s) => {
      return {
        ...s,
        blob: getEntityBlobAuthor(s.blob),
      };
    }),
  };
};

export type LocationMapThemeAsset = {
  decorations: EntityBlobsSamplerAsset;
  paths: EntityBlobsSamplerAsset;
  rooms: EntityBlobsSamplerAsset;
} & Omit<
  LocationMapThemeAuthor,
  "decorationsSelector" | "pathsSelector" | "roomsSelector"
>;

export const LOCATION_MAP_THEMES = {
  encampment: {
    decorations: [
      { weight: 5, blob: { appearanceFeatureNames: ["rock"] } },
      { weight: 4, blob: { appearanceFeatureNames: ["stone"] } },
    ],
    minDecorationCount: 2,
    maxDecorationCount: 4,
    paths: [
      { weight: 5, blob: { appearanceFeatureNames: ["trail"] } },
      { weight: 4, blob: { appearanceFeatureNames: ["path"] } },
    ],
    rooms: [
      { weight: 5, blob: { appearanceFeatureNames: ["enclosure"] } },
      { weight: 4, blob: { appearanceFeatureNames: ["tent"] } },
    ],
  },
  cave: {
    decorations: [
      { weight: 5, blob: { appearanceFeatureNames: ["rock"] } },
      { weight: 4, blob: { appearanceFeatureNames: ["stone"] } },
      { weight: 2, blob: { appearanceFeatureNames: ["boulder"] } },
    ],
    minDecorationCount: 2,
    maxDecorationCount: 4,
    paths: [
      { weight: 5, blob: { appearanceFeatureNames: ["opening"] } },
      { weight: 4, blob: { appearanceFeatureNames: ["hole"] } },
      { weight: 2, blob: { appearanceFeatureNames: ["chasm"] } },
      { weight: 2, blob: { appearanceFeatureNames: ["crack"] } },
    ],
    rooms: [
      { weight: 5, blob: { appearanceFeatureNames: ["chamber"] } },
      { weight: 4, blob: { appearanceFeatureNames: ["dome"] } },
      { weight: 2, blob: { appearanceFeatureNames: ["cavern"] } },
    ],
  },
} as const satisfies Record<string, LocationMapThemeAsset>;

export type LocationMapThemeName = keyof typeof LOCATION_MAP_THEMES;

export type LocationMapAsset = {
  themeName: LocationMapThemeName;
  encountersSampler: EncountersSamplerAsset;
  // Can't derive specific type from const without circularity error.
  connections?: string[];
} & Omit<
  LocationMapAuthor,
  "themeName" | "encounterNamesSampler" | "connectionNames"
>;

export const LOCATION_MAPS = {
  start_zone: {
    layout: Layout.Hub,
    rngSeed: 0n,
    mainRoomCount: 10,
    extraRoomCount: 0,
    loopCount: 5,
    themeName: "encampment",
    encountersSampler: [],
    minEncounterCount: 0,
    maxEncounterCount: 0,
    connections: [],
  },
  beginner_cave: {
    layout: Layout.Path,
    rngSeed: 0n,
    mainRoomCount: 10,
    extraRoomCount: 10,
    loopCount: 5,
    themeName: "cave",
    encountersSampler: [
      { weight: 5, name: "slime2" },
      { weight: 5, name: "slime3" },
      { weight: 3, name: "slime4" },
      { weight: 1, name: "slime2_bat1" },
    ],
    minEncounterCount: 8,
    maxEncounterCount: 12,
    connections: [],
  },
  triangle_loop: {
    // Smallest case that produces a triangular join: three main rooms chained
    // 0-1-2, plus one loop that adds the closing 0-2 edge to form a triangle.
    layout: Layout.Path,
    rngSeed: 0n,
    mainRoomCount: 3,
    extraRoomCount: 0,
    loopCount: 1,
    themeName: "cave",
    encountersSampler: [],
    minEncounterCount: 0,
    maxEncounterCount: 0,
    connections: [],
  },
} as const satisfies Record<string, LocationMapAsset>;

export type LocationMapName = keyof typeof LOCATION_MAPS;

export const toLocationMapThemeAuthor = (
  asset: LocationMapThemeAsset,
): LocationMapThemeAuthor => ({
  decorationsSelector: getEntityBlobsSampler(asset.decorations),
  minDecorationCount: asset.minDecorationCount,
  maxDecorationCount: asset.maxDecorationCount,
  pathsSelector: getEntityBlobsSampler(asset.paths),
  roomsSelector: getEntityBlobsSampler(asset.rooms),
});

export const toLocationMapAuthor = (
  asset: LocationMapAsset,
): LocationMapAuthor => ({
  themeName: asset.themeName,
  layout: asset.layout,
  rngSeed: asset.rngSeed,
  extraRoomCount: asset.extraRoomCount,
  mainRoomCount: asset.mainRoomCount,
  loopCount: asset.loopCount,
  encounterNamesSampler: asset.encountersSampler.map((s) => ({
    weight: s.weight,
    name: s.name,
  })),
  minEncounterCount: asset.minEncounterCount,
  maxEncounterCount: asset.maxEncounterCount,
  connectionNames: [...(asset.connections ?? [])],
});
