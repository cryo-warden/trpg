import { locationMapThemes } from ".";
import {
  Decoration,
  Layout,
  LocationMap,
  LocationMapTheme,
} from "../../stdb/types";
import { EntityBlobAsset, getEntityBlob } from "./entity_blobs";

export type DecorationAsset = { blob: EntityBlobAsset } & Omit<
  Decoration,
  "blob"
>;

export type LocationMapThemeAsset = {
  name: string;
  decorations: DecorationAsset[];
} & Omit<LocationMapTheme, "id" | "decorations">;

export type LocationMapAsset = { themeName: string } & Omit<
  LocationMap,
  "id" | "themeId"
>;

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
    decorations: asset.decorations.map((d) => {
      return {
        ...d,
        blob: getEntityBlob(d.blob),
      };
    }),
  }));

export const getLocationMaps = (
  assets: readonly LocationMapAsset[],
): LocationMap[] =>
  assets.map((asset, id) => ({
    ...asset,
    id,
    themeId: locationMapThemes.findIndex((t) => t.name === asset.themeName),
  }));
