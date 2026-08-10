import { DbConnection } from "../stdb";
import {
  type ActionAuthor,
  type AppearanceFeatureAuthor,
  type StatBlockAuthor,
  AppearanceFeatureType,
} from "../stdb/types";
import { namedPairs, newPlayerBlob, StatBlockAsset } from "./assets";
import { ACTIONS, ActionAsset } from "./assets/actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureAsset,
} from "./assets/appearance_features";
import { BASELINES } from "./assets/baselines";
import { TRAITS } from "./assets/traits";
import {
  ENCOUNTERS,
  ENCOUNTER_BLOBS,
  toEncounterAuthor,
  toEncounterBlobAuthor,
} from "./assets/encounters";
import { NAMED_ENTITY_BLOBS, getEntityBlobAuthor } from "./assets/entity_blobs";
import {
  LOCATION_MAPS,
  LOCATION_MAP_THEMES,
  toLocationMapAuthor,
  toLocationMapThemeAuthor,
} from "./assets/location_maps";

// Note the direction: the asset Records are pushed as name+value pairs (see
// namedPairs) and ALL name -> id resolution happens on the server at push
// time (see server/src/asset/author.rs). The converters below reshape only
// asset BODIES (authoring sugar -> wire shape); no client code touches a
// name or computes an id.

const toStatBlockAuthor = (asset: StatBlockAsset): StatBlockAuthor => ({
  attack: asset.attack ?? 0,
  mhp: asset.mhp ?? 0,
  defense: asset.defense ?? 0,
  mep: asset.mep ?? 0,
  actionNames: [...(asset.actionNames ?? [])],
  appearanceFeatureNames: [...(asset.appearanceFeatureNames ?? [])],
});

const toActionAuthor = (asset: ActionAsset): ActionAuthor => ({
  actionType: { tag: asset.type },
  steps: [...asset.steps],
});

const appearanceFeatureTypeMap = {
  noun: AppearanceFeatureType.Noun,
  adjective: AppearanceFeatureType.Adjective,
} as const;

const toAppearanceFeatureAuthor = (
  asset: AppearanceFeatureAsset,
): AppearanceFeatureAuthor => ({
  text: asset.text,
  appearanceFeatureType: appearanceFeatureTypeMap[asset.type],
  priority: asset.priority,
});

/** Pushes the production asset pack. Admin-gated server-side: only an
 * attached, rotated admin account may call this — clients never push
 * automatically. */
export const pushProductionAssets = (connection: DbConnection): Promise<void> =>
  connection.reducers.pushAssets({
    assetPack: {
      actions: namedPairs(ACTIONS, toActionAuthor),
      appearanceFeatures: namedPairs(
        APPEARANCE_FEATURES,
        toAppearanceFeatureAuthor,
      ),

      baselines: namedPairs(BASELINES, toStatBlockAuthor),
      traits: namedPairs(TRAITS, toStatBlockAuthor),

      encounterBlobs: namedPairs(ENCOUNTER_BLOBS, toEncounterBlobAuthor),
      encounters: namedPairs(ENCOUNTERS, toEncounterAuthor),

      locationMapThemes: namedPairs(
        LOCATION_MAP_THEMES,
        toLocationMapThemeAuthor,
      ),
      locationMaps: namedPairs(LOCATION_MAPS, toLocationMapAuthor),

      namedInstantiateEntityBlobs: namedPairs(
        NAMED_ENTITY_BLOBS,
        getEntityBlobAuthor,
      ),
      instantiateEntityBlobs: [],

      newPlayerBlob: getEntityBlobAuthor(newPlayerBlob),
    },
  });
