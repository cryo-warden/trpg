import { Layout, LocationMap } from "../../stdb/types";

export type LocationMapThemeAsset = { name: string };

export type LocationMapAsset = { themeName: string } & Omit<
  LocationMap,
  "id" | "themeId"
>;

export const LOCATION_MAP_THEMES = [
  { name: "cave" },
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
