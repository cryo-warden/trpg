import { DbConnection } from "../stdb";
import {
  type ActionAuthor,
  type AppearanceFeatureAuthor,
  type StatBlockAuthor,
  type StatBlockOwnerAuthor,
  AppearanceFeatureType,
} from "../stdb/types";
import { namedEntityBlobs, newPlayerBlob, StatBlockAsset } from "./assets";
import { ACTIONS } from "./assets/actions";
import { APPEARANCE_FEATURES } from "./assets/appearance_features";
import { BASELINES } from "./assets/baselines";
import { TRAITS } from "./assets/traits";
import { getEncounterAuthors, getEncounterBlobAuthors } from "./assets/encounters";
import { getEntityBlob } from "./assets/entity_blobs";
import {
  getLocationMapAuthors,
  getLocationMapThemeAuthors,
  LOCATION_MAPS,
  LOCATION_MAP_THEMES,
} from "./assets/location_maps";

// Note the direction: all name -> id resolution happens on the server at
// push time (see server/src/asset/author.rs). The pack below carries names
// only; the client never assigns or computes asset ids.

const assetToStatBlockAuthor = (asset: StatBlockAsset): StatBlockAuthor => ({
  attack: asset.attack ?? 0,
  mhp: asset.mhp ?? 0,
  defense: asset.defense ?? 0,
  mep: asset.mep ?? 0,
  actionNames: [...(asset.actionNames ?? [])],
  appearanceFeatureNames: [...(asset.appearanceFeatureNames ?? [])],
});

const getActionAuthors = (): ActionAuthor[] =>
  Object.entries(ACTIONS).map(([name, a]) => ({
    name,
    actionType: { tag: a.type },
    steps: [...a.steps],
  }));

const appearanceFeatureTypeMap = {
  noun: AppearanceFeatureType.Noun,
  adjective: AppearanceFeatureType.Adjective,
} as const;

const getAppearanceFeatureAuthors = (): AppearanceFeatureAuthor[] =>
  Object.entries(APPEARANCE_FEATURES).map(([name, a]) => ({
    name,
    text: a.text,
    appearanceFeatureType: appearanceFeatureTypeMap[a.type],
    priority: a.priority,
  }));

const getStatBlockOwnerAuthors = (
  record: Record<string, StatBlockAsset>,
): StatBlockOwnerAuthor[] =>
  Object.entries(record).map(([name, asset]) => ({
    name,
    statBlock: assetToStatBlockAuthor(asset),
  }));

export const init = (connection: DbConnection) => {
  connection.reducers.pushAssets({
    assetPack: {
      actions: getActionAuthors(),
      appearanceFeatures: getAppearanceFeatureAuthors(),

      baselines: getStatBlockOwnerAuthors(BASELINES),
      traits: getStatBlockOwnerAuthors(TRAITS),

      encounterBlobs: getEncounterBlobAuthors(),
      encounters: getEncounterAuthors(),

      locationMapThemes: getLocationMapThemeAuthors(LOCATION_MAP_THEMES),
      locationMaps: getLocationMapAuthors(LOCATION_MAPS),

      namedInstantiateEntityBlobs: Object.entries(namedEntityBlobs).map(
        ([name, blob]) => ({ name, blob: getEntityBlob(blob) }),
      ),
      instantiateEntityBlobs: [],

      newPlayerBlob: getEntityBlob(newPlayerBlob),
    },
  });
};
