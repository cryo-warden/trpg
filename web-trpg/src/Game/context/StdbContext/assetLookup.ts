import { useMemo } from "react";
import {
  ActionAsset,
  AppearanceFeatureAsset,
  ReadinessBlock,
  Stance,
} from "../../../stdb/types";
import {
  IntStatRequirements,
  IntStats,
  meetsRequirements,
} from "../../domain/statSummary";
import { ACTIONS, ActionName } from "../../assets/actions";
import {
  ACTION_APPEARANCES,
  ActionAppearance,
} from "../../../renderer/en-us/actions";
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
  "select * from quests",
  "select * from special_actions",
];

/** The special-action registry: which authored action serves each derived
 * item-verb role (take/drop/equip/unequip/eat). Null when a pack never
 * registered the role — that offer simply never derives. */
export type SpecialActionIds = {
  take: ActionId | null;
  drop: ActionId | null;
  equip: ActionId | null;
  unequip: ActionId | null;
  eat: ActionId | null;
  move: ActionId | null;
};

export const useSpecialActionIds = (): SpecialActionIds =>
  useTableData(
    "special_actions",
    (table) => {
      const byKey = new Map(
        [...table.iter()].map((row) => [row.key.tag, row.actionId]),
      );
      return {
        take: byKey.get("Take") ?? null,
        drop: byKey.get("Drop") ?? null,
        equip: byKey.get("Equip") ?? null,
        unequip: byKey.get("Unequip") ?? null,
        eat: byKey.get("Eat") ?? null,
        move: byKey.get("Move") ?? null,
      };
    },
    [],
  );

/** The COMMON verbs every bar may pin for a stable slot (the registered
 * specials minus the system-only re-arm): offered or derived in play,
 * absent from any granted set, configurable all the same. */
export const useCommonPinnableActionIds = (): ActionId[] => {
  const ids = useSpecialActionIds();
  return useMemo(
    () =>
      [ids.take, ids.drop, ids.equip, ids.unequip, ids.eat, ids.move].filter(
        (id): id is ActionId => id != null,
      ),
    [ids],
  );
};

/** Resolves a runtime action id to its PROPER display name (through the
 * client vocabulary), never the internal underscored key. Unknown ids
 * render as their raw name or #id. */
export const useActionDisplayNameOf = (): ((actionId: ActionId) => string) => {
  const names = useTableData(
    "actions",
    (table) =>
      new Map<number, string>(
        [...table.iter()].map((row) => [row.id, row.name]),
      ),
    [],
  );
  return useMemo(
    () => (actionId: ActionId) => {
      const raw = names.get(actionId);
      if (raw == null) {
        return `#${actionId}`;
      }
      return raw in ACTION_APPEARANCES
        ? ACTION_APPEARANCES[raw as ActionName].displayName
        : raw;
    },
    [names],
  );
};

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

/** The full subscribed stance rows (group blocks and requirements included),
 * ordered by id — the stances menu renders from these. */
export const useStanceDetailRows = (): Stance[] =>
  useTableData(
    "stances",
    (table) => [...table.iter()].sort((a, b) => a.id - b.id),
    [],
  );

/** The client mirror of the server's derived action set: every subscribed
 * action whose readiness requirements are met by a given readiness block. The
 * menus use it to project the candidate actions a hypothetical configuration
 * would make available. */
export const useActionsMeetingReadiness = (): ((
  readiness: ReadinessBlock,
) => ActionId[]) => {
  const rows = useTableData(
    "actions",
    (table) => [...table.iter()].map(({ id, name }) => ({ id, name })),
    [],
  );
  return useMemo(
    () => (readiness: ReadinessBlock) =>
      rows.flatMap(({ id, name }) => {
        const asset = toNamedActionAsset(name);
        if (asset == null) {
          return [];
        }
        return meetsRequirements(
          readiness as unknown as IntStats,
          asset.requirements as unknown as IntStatRequirements,
        )
          ? [id]
          : [];
      }),
    [rows],
  );
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
