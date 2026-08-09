import { DbConnection } from "../stdb";
import {
  type Action,
  type ActionEffect,
  type Baseline,
  type Trait,
  type StatBlock,
  type ActionStep,
  AppearanceFeature,
  AppearanceFeatureType,
} from "../stdb/types";
import {
  actions,
  appearanceFeatures,
  baselines,
  locationMaps,
  locationMapThemes,
  namedEntityBlobs,
  newPlayerBlob,
  StatBlockAsset,
  traits,
} from "./assets";
import { getEncounterBlobs, getEncounters } from "./assets/encounters";
import { getEntityBlob } from "./assets/entity_blobs";
import {
  getLocationMapConnections,
  getLocationMaps,
  getLocationMapThemes,
} from "./assets/location_maps";

const assetToStatBlock = (asset: StatBlockAsset): StatBlock => {
  return {
    attack: asset.attack ?? 0,
    mhp: asset.mhp ?? 0,
    defense: asset.defense ?? 0,
    mep: asset.mep ?? 0,
    actionIds: (asset.actionNames ?? []).map((name) =>
      actions.findIndex((a) => a.name === name),
    ),
    appearanceFeatureIds: (asset.appearanceFeatureNames ?? []).map((name) =>
      appearanceFeatures.findIndex((af) => af.name === name),
    ),
  } as StatBlock;
};

const getActions = () =>
  actions.map((a, id): Action => {
    return {
      id,
      name: a.name,
      actionType: { tag: a.type },
    };
  });

const getActionSteps = () => {
  let nextStepId = 1n;
  return actions.flatMap((a, actionId) => {
    const effects = a.steps.map((s): ActionEffect => {
      switch (s.tag) {
        case "Rest":
          return { tag: "Rest" };
        case "Move":
          return { tag: "Move" };
        case "Attack":
          return {
            tag: "Attack",
            value: s.value ?? 0,
          };
        case "Heal":
          return {
            tag: "Heal",
            value: s.value ?? 0,
          };
        default:
          throw new Error(`Unknown action effect tag: ${s.tag}`);
      }
    });
    return effects.map(
      (actionEffect, sequenceIndex): ActionStep => ({
        id: nextStepId++,
        actionId: actionId,
        sequenceIndex,
        actionEffect,
      }),
    );
  });
};

const appearanceFeatureTypeMap = {
  noun: AppearanceFeatureType.Noun,
  adjective: AppearanceFeatureType.Adjective,
} as const;

const getAppearanceFeatures = () =>
  appearanceFeatures.map((a, index) => {
    return {
      index,
      text: a.text,
      appearanceFeatureType: appearanceFeatureTypeMap[a.type],
      priority: a.priority,
    } as AppearanceFeature;
  });

const getBaselines = () =>
  baselines.map((b, id) => {
    return {
      id,
      name: b.name,
      statBlock: assetToStatBlock(b),
    } as Baseline;
  });

const getTraits = () =>
  traits.map((t, id) => {
    return {
      id,
      name: t.name,
      statBlock: assetToStatBlock(t),
    } as Trait;
  });

export const init = (connection: DbConnection) => {
  connection.reducers.pushAssets({
    assetPack: {
      actions: getActions(),
      actionSteps: getActionSteps(),
      appearanceFeatures: getAppearanceFeatures(),

      baselines: getBaselines(),
      traits: getTraits(),

      encounterBlobs: getEncounterBlobs(),
      encounters: getEncounters(),

      locationMapThemes: getLocationMapThemes(locationMapThemes),
      locationMaps: getLocationMaps(locationMaps),
      locationMapConnections: getLocationMapConnections(locationMaps),
      namedInstantiateEntityBlobs: Object.entries(namedEntityBlobs).map(
        ([name, blob]) => ({ name, blob: getEntityBlob(blob) }),
      ),
      instantiateEntityBlobs: [],

      newPlayerBlob: getEntityBlob(newPlayerBlob),
    },
  });
};
