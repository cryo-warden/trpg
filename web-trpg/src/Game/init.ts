import { DbConnection } from "../stdb";
import {
  type Action,
  type ActionEffect,
  type Baseline,
  type Trait,
  type StatBlock,
  type ActionStep,
  type EntityBlob,
  ActionHotkey,
  AppearanceFeature,
  AppearanceFeatureType,
} from "../stdb/types";
import {
  ActionHotkeyAsset,
  actions,
  appearanceFeatures,
  baselines,
  EntityBlobAsset,
  entityBlobs,
  newPlayerBlob,
  StatBlockAsset,
  traits,
} from "./assets";

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

const getActionHotkeys = (
  actionHotkeyAssets: ActionHotkeyAsset[],
): ActionHotkey[] =>
  actionHotkeyAssets.map(
    (aha) =>
      ({
        actionId: actions.findIndex((a) => a.name === aha.actionName),
        characterCode: aha.hotkey.charCodeAt(0),
      }) as ActionHotkey,
  );

const getEntityBlob = (entityBlobAsset: EntityBlobAsset): EntityBlob => {
  return {
    baseline: entityBlobAsset.baseline
      ? {
          entityId: 0n,
          baselineId: baselines.findIndex(
            (b) => b.name === entityBlobAsset.baseline,
          ),
        }
      : undefined,
    traits: entityBlobAsset.traits
      ? {
          entityId: 0n,
          traitIds: (entityBlobAsset.traits ?? []).map((name) =>
            traits.findIndex((t) => t.name === name),
          ),
        }
      : undefined,
    actionHotkeys: entityBlobAsset.actionHotkeys
      ? {
          entityId: 0n,
          actionHotkeys: getActionHotkeys(entityBlobAsset.actionHotkeys),
        }
      : undefined,
    name: entityBlobAsset.name
      ? {
          entityId: 0n,
          name: entityBlobAsset.name,
        }
      : undefined,
  } as EntityBlob;
};

export const init = (connection: DbConnection) => {
  connection.reducers.pushAssets({
    assetPack: {
      newPlayerBlob: getEntityBlob(newPlayerBlob),
      baselines: getBaselines(),
      traits: getTraits(),
      actions: getActions(),
      actionSteps: getActionSteps(),
      appearanceFeatures: getAppearanceFeatures(),
      instantiateEntityBlobs: entityBlobs.map(getEntityBlob),
    },
  });
};
