import { locationMapThemes } from ".";
import {
  Layout,
  LocationMap,
  LocationMapTheme,
  EntityBlobSample,
  EntityBlobsSampler,
  LocationMapConnection,
} from "../../stdb/types";
import { getEncounterIdsSampler, EncountersSamplerAsset } from "./encounters";
import { EntityBlobAsset, getEntityBlob } from "./entity_blobs";

export type EntityBlobSampleAsset = {
  blob: EntityBlobAsset;
} & Omit<EntityBlobSample, "blob">;

export type EntityBlobsSamplerAsset = EntityBlobSampleAsset[];

export const getEntityBlobsSampler = (
  asset: EntityBlobsSamplerAsset,
): EntityBlobsSampler => {
  return {
    selections: asset.map((s) => {
      return {
        ...s,
        blob: getEntityBlob(s.blob),
      };
    }),
  };
};

export type LocationMapThemeAsset = {
  name: string;
  decorations: EntityBlobsSamplerAsset;
  paths: EntityBlobsSamplerAsset;
  rooms: EntityBlobsSamplerAsset;
} & Omit<
  LocationMapTheme,
  "id" | "decorationsSelector" | "pathsSelector" | "roomsSelector"
>;

export type LocationMapAsset = {
  themeName: (typeof LOCATION_MAP_THEMES)[number]["name"];
  encountersSampler: EncountersSamplerAsset;
  // Can't derive specific type from const without circularity error.
  connections?: string[];
} & Omit<LocationMap, "id" | "themeId" | "encounterIdsSampler">;

export const LOCATION_MAP_THEMES = [
  {
    name: "encampment",
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
  {
    name: "cave",
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
] as const satisfies readonly LocationMapThemeAsset[];

export const LOCATION_MAPS = [
  {
    name: "start_zone",
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
  {
    name: "beginner_cave",
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
  {
    // Smallest case that produces a triangular join: three main rooms chained
    // 0-1-2, plus one loop that adds the closing 0-2 edge to form a triangle.
    name: "triangle_loop",
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
] as const satisfies readonly LocationMapAsset[];

export const getLocationMapThemes = (
  assets: readonly LocationMapThemeAsset[],
): LocationMapTheme[] =>
  assets.map((asset, id) => ({
    ...asset,
    id,
    decorationsSelector: getEntityBlobsSampler(asset.decorations),
    pathsSelector: getEntityBlobsSampler(asset.paths),
    roomsSelector: getEntityBlobsSampler(asset.rooms),
  }));

export const getLocationMaps = (
  assets: readonly LocationMapAsset[],
): LocationMap[] =>
  assets.map((asset, id) => ({
    ...asset,
    id,
    themeId: locationMapThemes.findIndex((t) => t.name === asset.themeName),
    encounterIdsSampler: getEncounterIdsSampler(asset.encountersSampler),
  }));

export const getLocationMapConnections = (
  assets: readonly LocationMapAsset[],
): LocationMapConnection[] => {
  let id = 0;
  return assets.flatMap((a) =>
    (a.connections ?? []).map(
      (c): LocationMapConnection => ({
        id: id++,
        exitLocationMapId: LOCATION_MAPS.findIndex((m) => m.name === a.name),
        destinationLocationMapId: LOCATION_MAPS.findIndex((m) => m.name === c),
      }),
    ),
  );
};
