import { locationMapThemes } from ".";
import {
  Layout,
  LocationMap,
  LocationMapTheme,
  EntityBlobSample,
  EntityBlobsSampler,
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
  themeName: string;
  encountersSampler: EncountersSamplerAsset;
} & Omit<LocationMap, "id" | "themeId" | "encounterIdsSampler">;

export const LOCATION_MAP_THEMES = [
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
