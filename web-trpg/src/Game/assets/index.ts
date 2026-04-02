import { StatBlockAsset } from "./types";
import { BASELINES } from "./baselines";
import { ActionAsset, ACTIONS } from "./actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureAsset,
} from "./appearance_features";
import {
  ENTITY_BLOBS,
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
export const entityBlobs = ENTITY_BLOBS as readonly EntityBlobAsset[];
export const traits = TRAITS as readonly StatBlockAsset[];
export const newPlayerBlob = NEW_PLAYER_BLOB as EntityBlobAsset;
export const locationMaps = LOCATION_MAPS as readonly LocationMapAsset[];
export const locationMapThemes =
  LOCATION_MAP_THEMES as readonly LocationMapThemeAsset[];

export const assets = {
  actions,
  appearanceFeatures,
  baselines,
  entityBlobs,
  newPlayerBlob,
  traits,
  locationMapThemes,
  locationMaps,
};
