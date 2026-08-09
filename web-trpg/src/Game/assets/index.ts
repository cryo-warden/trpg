import { StatBlockAsset } from "./types";
import { BASELINES } from "./baselines";
import { ActionAsset, ACTIONS, ActionName } from "./actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureAsset,
  AppearanceFeatureName,
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

// Ordered views of the asset Records for code that starts from a runtime id
// (component data): ids are assigned server-side by the enumeration order of
// the pushed Records, so indexing these arrays by id is the backward
// (id -> name/display) conversion for data from this same push. Once
// incremental asset updates land (ids preserved across pushes by name), this
// must switch to looking the name up in the subscribed asset tables instead.
const ordered = <T>(record: Record<string, T>) =>
  Object.entries(record).map(([name, body]) => ({ name, ...body }));

export const actions: readonly ({ name: ActionName } & ActionAsset)[] =
  ordered(ACTIONS) as ({ name: ActionName } & ActionAsset)[];
export const appearanceFeatures: readonly ({
  name: AppearanceFeatureName;
} & AppearanceFeatureAsset)[] = ordered(APPEARANCE_FEATURES) as ({
  name: AppearanceFeatureName;
} & AppearanceFeatureAsset)[];

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
