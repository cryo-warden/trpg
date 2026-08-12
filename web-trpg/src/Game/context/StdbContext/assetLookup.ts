import { useMemo } from "react";
import { ActionAsset, AppearanceFeatureAsset } from "../../../stdb/types";
import {
  ACTIONS,
  ACTION_APPEARANCES,
  ActionAppearance,
  ActionName,
} from "../../assets/actions";
import {
  APPEARANCE_FEATURES,
  AppearanceFeatureName,
} from "../../assets/appearance_features";
import { ActionId } from "../../trpg";
import { useTableData } from "./useTableData";

// The backward (id -> name) half of the asset name/id asymmetry. The server
// alone converts names to ids, at push time; the client converts the ids it
// sees in component data back to names through its subscription of the asset
// tables (their id and name columns), then looks the asset up in its local
// Records. The client never assigns, computes, or assumes an asset id.
export const assetQueries = [
  "select * from actions",
  "select * from action_rounds",
  "select * from appearance_features",
];

export type NamedActionAsset = { name: ActionName } & ActionAsset;

const toNamedActionAsset = (name: string): NamedActionAsset | null =>
  name in ACTIONS
    ? { name: name as ActionName, ...ACTIONS[name as ActionName] }
    : null;

export const useActionAsset = (
  actionId: ActionId | null,
): NamedActionAsset | null =>
  useTableData(
    "actions",
    (table) => {
      if (actionId == null) {
        return null;
      }
      const row = table.id.find(actionId);
      return row == null ? null : toNamedActionAsset(row.name);
    },
    [actionId],
  );

export const useActionAssetOf = (): ((
  actionId: ActionId,
) => NamedActionAsset | null) => {
  const namesById = useTableData(
    "actions",
    (table) =>
      new Map<ActionId, string>(
        [...table.iter()].map((row) => [row.id, row.name]),
      ),
    [],
  );
  return useMemo(
    () => (actionId: ActionId) => {
      const name = namesById.get(actionId);
      return name == null ? null : toNamedActionAsset(name);
    },
    [namesById],
  );
};

/** Resolves a runtime action id to the client's display vocabulary. */
export const useActionAppearanceOf = (): ((
  actionId: ActionId,
) => ActionAppearance | null) => {
  const actionAssetOf = useActionAssetOf();
  return useMemo(
    () => (actionId: ActionId) => {
      const asset = actionAssetOf(actionId);
      return asset == null ? null : ACTION_APPEARANCES[asset.name];
    },
    [actionAssetOf],
  );
};

export type NamedAppearanceFeatureAsset = {
  name: AppearanceFeatureName;
} & AppearanceFeatureAsset;

export const useAppearanceFeatureAssetsOf = (): ((
  indexes: number[] | null,
) => NamedAppearanceFeatureAsset[] | null) => {
  const namesByIndex = useTableData(
    "appearance_features",
    (table) =>
      new Map<number, string>(
        [...table.iter()].map((row) => [row.index, row.name]),
      ),
    [],
  );
  return useMemo(
    () => (indexes: number[] | null) =>
      indexes == null
        ? null
        : indexes.flatMap((index) => {
            const name = namesByIndex.get(index);
            return name != null && name in APPEARANCE_FEATURES
              ? [
                  {
                    name: name as AppearanceFeatureName,
                    ...APPEARANCE_FEATURES[name as AppearanceFeatureName],
                  },
                ]
              : [];
          }),
    [namesByIndex],
  );
};
