import { useMemo } from "react";
import {
  ActionAsset,
  AppearanceFeatureAsset,
  Stance,
} from "../../../stdb/types";
import { StanceReachabilityGraph } from "../../domain/stanceReachability";
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
  "select * from stances",
];

/** The subscribed stance rows (id + name), ordered by id. */
export const useStanceRows = (): { id: number; name: string }[] =>
  useTableData(
    "stances",
    (table) =>
      [...table.iter()]
        .map(({ id, name }) => ({ id, name }))
        .sort((a, b) => a.id - b.id),
    [],
  );

/** The full subscribed stance rows (stat block and requirements included),
 * ordered by id — the stances menu renders from these. */
export const useStanceDetailRows = (): Stance[] =>
  useTableData(
    "stances",
    (table) => [...table.iter()].sort((a, b) => a.id - b.id),
    [],
  );

/** The graph the stances menu closes over: each stance's action and stance
 * grants (from its subscribed stat block), and each action's SetStance
 * targets (from the client's own asset Records — the server does not
 * publish effects, but the client authored them). */
export const useStanceReachabilityGraph = (): StanceReachabilityGraph => {
  const stanceRows = useStanceDetailRows();
  const actionRows = useTableData(
    "actions",
    (table) => [...table.iter()].map(({ id, name }) => ({ id, name })),
    [],
  );
  return useMemo(() => {
    const stanceIdsByName = new Map(
      stanceRows.map((row) => [row.name, row.id]),
    );
    const stanceGrants = new Map(
      stanceRows.map((row) => [
        row.id,
        {
          actionIds: [...row.statBlock.actionIds],
          stanceIds: [...row.statBlock.stanceIds],
        },
      ]),
    );
    const actionStanceTargets = new Map<number, number[]>();
    for (const { id, name } of actionRows) {
      const asset = toNamedActionAsset(name);
      if (asset == null) {
        continue;
      }
      const targets = asset.rounds
        .flatMap((round) => round.effects)
        .flatMap((effect) =>
          effect.tag === "SetStance"
            ? (stanceIdsByName.get(effect.value) ?? [])
            : [],
        );
      if (targets.length > 0) {
        actionStanceTargets.set(id, targets);
      }
    }
    return { stanceGrants, actionStanceTargets };
  }, [stanceRows, actionRows]);
};

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
