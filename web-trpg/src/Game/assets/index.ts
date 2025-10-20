import { StatBlockAsset } from "./types";
import { BASELINES } from "./baselines";
import { ActionAsset, ACTIONS } from "./actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureAsset,
} from "./appearance_features";
import { ENTITY_BLOBS, EntityBlobAsset } from "./entity_blobs";
import { TRAITS } from "./traits";

export type {
  ActionAsset,
  AppearanceFeatureAsset,
  EntityBlobAsset,
  StatBlockAsset,
};

export const actions = ACTIONS as readonly ActionAsset[];
export const appearanceFeatures =
  APPEARANCE_FEATURES as readonly AppearanceFeatureAsset[];
export const baselines = BASELINES as readonly StatBlockAsset[];
export const entityBlobs = ENTITY_BLOBS as readonly EntityBlobAsset[];
export const traits = TRAITS as readonly StatBlockAsset[];

export const assets = {
  actions,
  appearanceFeatures,
  baselines,
  entityBlobs,
  traits,
};
