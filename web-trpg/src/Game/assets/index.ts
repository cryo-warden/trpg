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

/**
 * SATS has no map type, so a Record cannot cross the wire directly: this is
 * the ONE adapter that turns Record entries into the wire's name+value pairs.
 * Names pass through verbatim from the Record keys; `toValue` converts only
 * the body (authoring sugar -> wire shape) and never sees a name.
 */
export const namedPairs = <T, V>(
  record: Record<string, T>,
  toValue: (value: T) => V,
): { name: string; value: V }[] =>
  Object.entries(record).map(([name, value]) => ({
    name,
    value: toValue(value),
  }));
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
