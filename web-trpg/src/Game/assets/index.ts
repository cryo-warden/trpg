import { StatBlockAsset } from "./types";
import { BASELINES } from "./baselines";
import { ActionAsset, ACTIONS } from "./actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureAsset,
} from "./appearance_features";
import {
  NAMED_ENTITY_BLOBS,
  EntityBlobAsset,
  ActionHotkeyAsset,
  NEW_PLAYER_BLOB,
} from "./entity_blobs";
import { TRAITS } from "./traits";
import {
  LocationMapAsset,
  LOCATION_MAPS,
  LOCATION_MAP_THEMES,
  LocationMapThemeAsset,
} from "./location_maps";

export type {
  ActionAsset,
  ActionHotkeyAsset,
  AppearanceFeatureAsset,
  EntityBlobAsset,
  StatBlockAsset,
  LocationMapAsset,
};

export const actions = ACTIONS as readonly ActionAsset[];
export const appearanceFeatures =
  APPEARANCE_FEATURES as readonly AppearanceFeatureAsset[];
export const baselines = BASELINES as readonly StatBlockAsset[];
export const namedEntityBlobs = NAMED_ENTITY_BLOBS as Record<
  string,
  EntityBlobAsset
>;
export const traits = TRAITS as readonly StatBlockAsset[];
export const newPlayerBlob = NEW_PLAYER_BLOB as EntityBlobAsset;
export const locationMaps = LOCATION_MAPS as readonly LocationMapAsset[];
export const locationMapThemes =
  LOCATION_MAP_THEMES as readonly LocationMapThemeAsset[];

export const assets = {
  actions,
  appearanceFeatures,
  baselines,
  namedEntityBlobs,
  newPlayerBlob,
  traits,
  locationMapThemes,
  locationMaps,
};
