import {
  type Action,
  type ActionEffect,
  type Baseline,
  type Trait,
  type StatBlock,
  type ActionStep,
  type EntityBlob,
  type DbConnection,
  type SpecialEntityBlob,
  SpecialEntityBlobType,
  TraitsComponent,
  ActionHotkey,
} from "../stdb";
import {
  actions,
  appearanceFeatures,
  baselines,
  StatBlockAsset,
  traits,
} from "./assets";
import { EntityId } from "./trpg";

const assetToStatBlock = (asset: StatBlockAsset): StatBlock => {
  return {
    attack: asset.attack ?? 0,
    mhp: asset.mhp ?? 0,
    defense: asset.defense ?? 0,
    mep: asset.mep ?? 0,
    actionIds: (asset.actionNames ?? []).map((name) =>
      actions.findIndex((a) => a.name === name)
    ),
    appearanceFeatureIds: (asset.appearanceFeatureNames ?? []).map((name) =>
      appearanceFeatures.findIndex((af) => af.name === name)
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
      })
    );
  });
};

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

type ActionHotkeyAsset = {
  actionName: (typeof actions)[number]["name"];
  hotkey: string;
};

const getActionHotkeys = (
  actionHotkeyAssets: ActionHotkeyAsset[]
): ActionHotkey[] =>
  actionHotkeyAssets.map(
    (aha) =>
      ({
        actionId: actions.findIndex((a) => a.name === aha.actionName),
        characterCode: aha.hotkey.charCodeAt(0),
      } as ActionHotkey)
  );

type EntityBlobAsset = {
  actionHotkeys?: ActionHotkeyAsset[];
  allegiance?: EntityId;
  baseline?: (typeof baselines)[number]["name"];
  traits?: (typeof traits)[number]["name"][];
};

const getEntityBlob = (entityBlobAsset: EntityBlobAsset): EntityBlob => {
  return {
    entityId: 0n,
    allegiance: entityBlobAsset.allegiance
      ? {
          entityId: 0n,
          allegianceEntityId: entityBlobAsset.allegiance,
        }
      : undefined,
    baseline: entityBlobAsset.baseline
      ? {
          entityId: 0n,
          baselineId: baselines.findIndex(
            (b) => b.name === entityBlobAsset.baseline
          ),
        }
      : undefined,
    traits: entityBlobAsset.traits
      ? {
          entityId: 0n,
          traitIds: (entityBlobAsset.traits ?? []).map((name) =>
            traits.findIndex((t) => t.name === name)
          ),
        }
      : undefined,
    actionHotkeys: entityBlobAsset.actionHotkeys
      ? {
          entityId: 0n,
          actionHotkeys: getActionHotkeys(entityBlobAsset.actionHotkeys),
        }
      : undefined,
  } as EntityBlob;
};

const getSpecialEntityBlobs = (): SpecialEntityBlob[] => {
  return [
    {
      specialEntityBlobType: SpecialEntityBlobType.NewPlayer,
      blob: getEntityBlob({
        actionHotkeys: [
          { actionName: "boppity_bop", hotkey: "v" },
          { actionName: "quick_move", hotkey: "m" },
          { actionName: "divine_heal", hotkey: "h" },
        ],
        allegiance: 0n,
        baseline: "human",
        traits: ["admin", "mobile", "bopper"],
      }),
    } as SpecialEntityBlob,
  ] as SpecialEntityBlob[];
};

export const init = (connection: DbConnection) => {
  connection.reducers.registerAdmin();
  connection.reducers.adminApplyBundle({
    actions: getActions(),
    actionSteps: getActionSteps(),
    baselines: getBaselines(),
    traits: getTraits(),
    specialEntityBlobs: getSpecialEntityBlobs(),
  });
};
