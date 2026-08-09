import { EntityBlobAuthor } from "../../stdb/types";
import { ActionName } from "./actions";
import { AppearanceFeatureName } from "./appearance_features";
import { BaselineName } from "./baselines";
import { TraitName } from "./traits";

export type ActionHotkeyAsset = {
  actionName: ActionName;
  hotkey: string;
};

// All asset and entity references in a blob asset are NAMES. The client never
// resolves any of them: the pushed EntityBlobAuthor carries the names, and
// push_assets on the server converts them to ids (the forward half of the
// name/id asymmetry — see server/src/asset/author.rs).
export type EntityBlobAsset = Partial<
  Omit<
    EntityBlobAuthor,
    | "name"
    | "baselineName"
    | "traitNames"
    | "actionNames"
    | "actionHotkeys"
    | "appearanceFeatureNames"
    | "allegiance"
  >
> & {
  name?: string;
  baseline?: BaselineName;
  traits?: TraitName[];
  actionNames?: ActionName[];
  actionHotkeys?: ActionHotkeyAsset[];
  appearanceFeatureNames?: AppearanceFeatureName[];
  /** The registered name of the allegiance entity, resolved server-side at
   * instantiation via the Named selector. */
  allegiance?: string;
};

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

export const getEntityBlobAuthor = (
  entityBlobAsset: EntityBlobAsset,
): EntityBlobAuthor => ({
  name: entityBlobAsset.name ? { name: entityBlobAsset.name } : undefined,
  location: entityBlobAsset.location,
  path: entityBlobAsset.path,
  allegiance: entityBlobAsset.allegiance
    ? {
        allegianceEntityId: {
          tag: "Named",
          value: entityBlobAsset.allegiance,
        },
      }
    : undefined,
  baselineName: entityBlobAsset.baseline,
  traitNames: entityBlobAsset.traits ? [...entityBlobAsset.traits] : undefined,
  actionNames: entityBlobAsset.actionNames
    ? [...entityBlobAsset.actionNames]
    : undefined,
  actionHotkeys: entityBlobAsset.actionHotkeys?.map((hotkeyAsset) => ({
    actionName: hotkeyAsset.actionName,
    characterCode: hotkeyAsset.hotkey.charCodeAt(0),
  })),
  appearanceFeatureNames: entityBlobAsset.appearanceFeatureNames
    ? [...entityBlobAsset.appearanceFeatureNames]
    : undefined,
  hp: entityBlobAsset.hp,
  ep: entityBlobAsset.ep,
  attack: entityBlobAsset.attack,
  playerController: entityBlobAsset.playerController,
  enemyController: entityBlobAsset.enemyController,
});
