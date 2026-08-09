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

// All assets are Records keyed by canonical name. The client never converts a
// name to an id — the server interns names at push time — and code that holds
// a runtime id from component data resolves it back to a name through the
// subscribed asset tables (see context/StdbContext/assetLookup.ts), then
// looks the asset up here.
export const actions = ACTIONS as Record<string, ActionAsset>;
export const appearanceFeatures = APPEARANCE_FEATURES as Record<
  string,
  AppearanceFeatureAsset
>;
export const baselines = BASELINES as Record<string, StatBlockAsset>;
export const traits = TRAITS as Record<string, StatBlockAsset>;
export const namedEntityBlobs = NAMED_ENTITY_BLOBS as Record<
  string,
  EntityBlobAsset
>;
export const newPlayerBlob = NEW_PLAYER_BLOB as EntityBlobAsset;
export const locationMaps = LOCATION_MAPS as Record<string, LocationMapAsset>;
export const locationMapThemes = LOCATION_MAP_THEMES as Record<
  string,
  LocationMapThemeAsset
>;

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
