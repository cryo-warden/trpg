import { actions, appearanceFeatures, baselines, traits } from ".";
import { ActionHotkey, EntityBlob } from "../../stdb/types";
import { Simplify } from "../../structural/Simplify";
import { APPEARANCE_FEATURES } from "./appearance_features";
import { BASELINES } from "./baselines";
import { TRAITS } from "./traits";

export type ActionHotkeyAsset = {
  actionName: (typeof actions)[number]["name"];
  hotkey: string;
};

type AppearanceFeatureName = (typeof APPEARANCE_FEATURES)[number]["name"];

export type EntityBlobAsset = Simplify<
  Partial<
    Omit<
      EntityBlob,
      "name" | "baseline" | "traits" | "actionHotkeys" | "appearanceFeatures"
    >
  > & {
    name?: string;
    baseline?: (typeof BASELINES)[number]["name"];
    traits?: (typeof TRAITS)[number]["name"][];
    actionHotkeys?: ActionHotkeyAsset[];
    appearanceFeatureNames?: AppearanceFeatureName[];
  }
>;

export const ENTITY_BLOBS = [
  { name: "allegiance1" },
  { name: "allegiance2" },
] as const satisfies readonly EntityBlobAsset[];

export const NEW_PLAYER_BLOB = {
  actionHotkeys: [
    { actionName: "boppity_bop", hotkey: "v" },
    { actionName: "quick_move", hotkey: "m" },
    { actionName: "divine_heal", hotkey: "h" },
  ],
  baseline: "human",
  traits: ["admin", "mobile", "bopper"],
} as const satisfies EntityBlobAsset;

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

const getAppearanceFeatures = (
  appearanceFeatureNames: AppearanceFeatureName[],
) =>
  appearanceFeatureNames.map((name) =>
    appearanceFeatures.findIndex((feature) => feature.name === name),
  );

export const getEntityBlob = (entityBlobAsset: EntityBlobAsset): EntityBlob => {
  return {
    ...entityBlobAsset,
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
    appearanceFeatures: entityBlobAsset.appearanceFeatureNames
      ? {
          entityId: 0n,
          appearanceFeatureIndexes: getAppearanceFeatures(
            entityBlobAsset.appearanceFeatureNames,
          ),
        }
      : undefined,
  } as EntityBlob;
};
