import { locationMapThemes } from ".";
import {
  Layout,
  LocationMap,
  LocationMapTheme,
  WeightedSelection as FixedWeightedSelection,
} from "../../stdb/types";
import { EntityBlobAsset, getEntityBlob } from "./entity_blobs";

export type WeightedSelection<T> = {
  value: T;
} & Omit<FixedWeightedSelection, "value">;

export type WeightedSelector<T> = WeightedSelection<T>[];

export type LocationMapThemeAsset = {
  name: string;
  decorations: WeightedSelection<EntityBlobAsset>[];
} & Omit<LocationMapTheme, "id" | "decorationsSelector">;

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
    decorationsSelector: {
      selections: asset.decorations.map((d) => {
        return {
          ...d,
          value: getEntityBlob(d.value),
        };
      }),
    },
  }));

export const getLocationMaps = (
  assets: readonly LocationMapAsset[],
): LocationMap[] =>
  assets.map((asset, id) => ({
    ...asset,
    id,
    themeId: locationMapThemes.findIndex((t) => t.name === asset.themeName),
  }));
