import { ActionHotkey, EntityBlob } from "../../stdb/types";
import { Simplify } from "../../structural/Simplify";
import { ACTIONS, ActionName } from "./actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureName,
} from "./appearance_features";
import { BASELINES, BaselineName } from "./baselines";
import { TRAITS, TraitName } from "./traits";

export type ActionHotkeyAsset = {
  actionName: ActionName;
  hotkey: string;
};

export type EntityBlobAsset = Simplify<
  Partial<
    Omit<
      EntityBlob,
      | "name"
      | "baseline"
      | "traits"
      | "actionHotkeys"
      | "appearanceFeatures"
      | "allegiance"
    >
  > & {
    name?: string;
    baseline?: BaselineName;
    traits?: TraitName[];
    actionHotkeys?: ActionHotkeyAsset[];
    appearanceFeatureNames?: AppearanceFeatureName[];
    /** The registered name of the allegiance entity, resolved server-side at
     * instantiation via the Named selector. */
    allegiance?: string;
  }
>;

/** Blobs instantiated at push time and registered under their Record key, so
 * other blobs can reference them with Named selectors. */
export const NAMED_ENTITY_BLOBS = {
  allegiance1: {},
  allegiance2: {},
} as const satisfies Record<string, EntityBlobAsset>;

export const NEW_PLAYER_BLOB = {
  actionHotkeys: [
    { actionName: "boppity_bop", hotkey: "v" },
    { actionName: "quick_move", hotkey: "m" },
    { actionName: "divine_heal", hotkey: "h" },
  ],
  baseline: "human",
  traits: ["admin", "mobile", "bopper"],
  allegiance: "allegiance1",
} as const satisfies EntityBlobAsset;

// Asset references INSIDE entity blobs (baseline, traits, actions,
// appearance features) are still integer ids on the wire, so this one
// forward conversion remains client-side: the ids below are the enumeration
// order of this same push's Records, which is exactly how push_assets
// assigns them. Once blob fields grow asset-name selectors (like the
// entity-id Named selector), this moves server-side with the rest of the
// forward conversion.
const assetId = (record: Record<string, unknown>, name: string): number =>
  Object.keys(record).indexOf(name);

const getActionHotkeys = (
  actionHotkeyAssets: ActionHotkeyAsset[],
): ActionHotkey[] =>
  actionHotkeyAssets.map(
    (aha) =>
      ({
        actionId: assetId(ACTIONS, aha.actionName),
        characterCode: aha.hotkey.charCodeAt(0),
      }) as ActionHotkey,
  );

export const getEntityBlob = (entityBlobAsset: EntityBlobAsset): EntityBlob => {
  return {
    ...entityBlobAsset,
    baseline: entityBlobAsset.baseline
      ? {
          baselineId: assetId(BASELINES, entityBlobAsset.baseline),
        }
      : undefined,
    traits: entityBlobAsset.traits
      ? {
          traitIds: (entityBlobAsset.traits ?? []).map((name) =>
            assetId(TRAITS, name),
          ),
        }
      : undefined,
    actionHotkeys: entityBlobAsset.actionHotkeys
      ? {
          actionHotkeys: getActionHotkeys(entityBlobAsset.actionHotkeys),
        }
      : undefined,
    name: entityBlobAsset.name
      ? {
          name: entityBlobAsset.name,
        }
      : undefined,
    allegiance: entityBlobAsset.allegiance
      ? {
          allegianceEntityId: {
            tag: "Named",
            value: entityBlobAsset.allegiance,
          },
        }
      : undefined,
    appearanceFeatures: entityBlobAsset.appearanceFeatureNames
      ? {
          appearanceFeatureIndexes: entityBlobAsset.appearanceFeatureNames.map(
            (name) => assetId(APPEARANCE_FEATURES, name),
          ),
        }
      : undefined,
  } as EntityBlob;
};
