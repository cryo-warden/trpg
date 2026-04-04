import { locationMapThemes } from ".";
import {
  Layout,
  LocationMap,
  LocationMapTheme,
  WeightedSelection as FixedWeightedSelection,
} from "../../stdb/types";
import { EntityBlobAsset, getEntityBlob } from "./entity_blobs";

export type WeightedSelectionAsset<T> = {
  value: T;
} & Omit<FixedWeightedSelection, "value">;

export type WeightedSelectorAsset<T> = WeightedSelectionAsset<T>[];

export const getWeightedSelector = <T, R>(
  asset: WeightedSelectorAsset<T>,
  mapValue: (v: T) => R,
): { selections: { weight: number; value: R }[] } => {
  return {
    selections: asset.map((d) => {
      return {
        ...d,
        value: mapValue(d.value),
      };
    }),
  };
};

export type LocationMapThemeAsset = {
  name: string;
  decorations: WeightedSelectionAsset<EntityBlobAsset>[];
  paths: WeightedSelectionAsset<EntityBlobAsset>[];
  rooms: WeightedSelectionAsset<EntityBlobAsset>[];
} & Omit<
  LocationMapTheme,
  "id" | "decorationsSelector" | "pathsSelector" | "roomsSelector"
>;

export type LocationMapAsset = { themeName: string } & Omit<
  LocationMap,
  "id" | "themeId"
>;

export const LOCATION_MAP_THEMES = [
  {
    name: "cave",
    decorations: [
      { weight: 5, value: { appearanceFeatureNames: ["rock"] } },
      { weight: 4, value: { appearanceFeatureNames: ["stone"] } },
      { weight: 2, value: { appearanceFeatureNames: ["boulder"] } },
    ],
    minDecorationCount: 2,
    maxDecorationCount: 4,
    paths: [
      { weight: 5, value: { appearanceFeatureNames: ["opening"] } },
      { weight: 4, value: { appearanceFeatureNames: ["hole"] } },
      { weight: 2, value: { appearanceFeatureNames: ["chasm"] } },
      { weight: 2, value: { appearanceFeatureNames: ["crack"] } },
    ],
    rooms: [
      { weight: 5, value: { appearanceFeatureNames: ["chamber"] } },
      { weight: 4, value: { appearanceFeatureNames: ["dome"] } },
      { weight: 2, value: { appearanceFeatureNames: ["cavern"] } },
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
  },
] as const satisfies readonly LocationMapAsset[];

export const getLocationMapThemes = (
  assets: readonly LocationMapThemeAsset[],
): LocationMapTheme[] =>
  assets.map((asset, id) => ({
    ...asset,
    id,
    decorationsSelector: getWeightedSelector(asset.decorations, getEntityBlob),
    pathsSelector: getWeightedSelector(asset.paths, getEntityBlob),
    roomsSelector: getWeightedSelector(asset.rooms, getEntityBlob),
  }));

export const getLocationMaps = (
  assets: readonly LocationMapAsset[],
): LocationMap[] =>
  assets.map((asset, id) => ({
    ...asset,
    id,
    themeId: locationMapThemes.findIndex((t) => t.name === asset.themeName),
  }));
