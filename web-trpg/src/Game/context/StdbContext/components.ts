import { useMemo } from "react";
import { getActionOptions } from "../../domain/actionOptions";
import { ActionId, EntityId } from "../../trpg";
import { useMyAccountId } from "./account";
import { useActionAsset, useActionAssetOf } from "./assetLookup";
import { RowType } from "./RowType";
import { createUseTable } from "./useTable";
import { RemoteTables, useTableData } from "./useTableData";
import { EntityPresentation } from "../../domain/prominence";
import { selectHostiles } from "../../domain/threat";
import {
  selectEntityPresentations,
  selectLocationEntities,
} from "./tableSelectors";
import { Focus } from "../FocusContext";

const createUseComponent =
  <T extends keyof RemoteTables>(tableName: T) =>
  (entityId: EntityId | null): RowType<T> | null =>
    useTableData(
      tableName,
      (table): RowType<T> | null => {
        if (!("entityId" in table)) {
          throw new Error(
            `Table "${tableName}" used with useComponent does not have an entityId unique index.`,
          );
        }

        if (entityId == null) {
          return null;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (table.entityId as any).find(entityId) ?? null;
      },
      [entityId],
    );

export const componentQueries = [
  "select * from action_hotkeys_components",
  "select * from actions_components",
  "select * from action_state_components",
  "select * from allegiance_components",
  "select * from appearance_features_components",
  "select * from attack_components",
  "select * from ep_components",
  "select * from hp_components",
  "select * from location_components",
  "select * from path_components",
  "select * from player_controller_components",
  "select * from queued_action_state_components",
];

const useActionHotkeysComponent = createUseComponent(
  "action_hotkeys_components",
);
export const useActionStateComponent = createUseComponent(
  "action_state_components",
);
export const useActionsComponent = createUseComponent("actions_components");
export const useAttackComponent = createUseComponent("attack_components");
export const useEpComponent = createUseComponent("ep_components");
export const useHpComponent = createUseComponent("hp_components");
const useLocationComponent = createUseComponent("location_components");
export const useQueuedActionStateComponent = createUseComponent(
  "queued_action_state_components",
);

export const useAllegianceComponents = createUseTable("allegiance_components");
export const useAppearanceFeaturesComponents = createUseTable(
  "appearance_features_components",
);

const useAllegianceComponent = createUseComponent("allegiance_components");
const usePathComponent = createUseComponent("path_components");

export const useLocation = (entityId: EntityId | null) => {
  const component = useLocationComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.locationEntityId;
};

/** Actions valid with the focused entity as their would-be target. */
export const useActionOptions = (focus: Focus): ActionId[] => {
  const playerEntity = usePlayerEntity();
  const actionsComponent = useActionsComponent(playerEntity);
  const actionAssetOf = useActionAssetOf();

  const targetHp = useHpComponent(focus);
  const playerAllegiance = useAllegianceComponent(playerEntity);
  const targetAllegiance = useAllegianceComponent(focus);
  const targetPath = usePathComponent(focus);

  return useMemo(
    () =>
      getActionOptions({
        actionIds: actionsComponent?.actionIds ?? [],
        actionAssetOf,
        targetHasHp: !!targetHp,
        targetHasPath: !!targetPath,
        playerEntity,
        target: focus,
        playerAllegianceId: playerAllegiance?.allegianceEntityId ?? null,
        targetAllegianceId: targetAllegiance?.allegianceEntityId ?? null,
      }),
    [
      actionsComponent,
      actionAssetOf,
      playerEntity,
      targetHp,
      playerAllegiance,
      targetAllegiance,
      targetPath,
      focus,
    ],
  );
};

/** The hostiles sharing the player's location; non-empty means threatened. */
export const useHostiles = (): EntityId[] => {
  const playerEntity = usePlayerEntity();
  const location = useLocation(playerEntity);
  const cohabitantIds = useLocationEntities(location);
  const playerAllegiance = useAllegianceComponent(playerEntity);
  const hpRows = useTableData("hp_components", (table) => [...table.iter()], []);
  const allegianceRows = useTableData(
    "allegiance_components",
    (table) => [...table.iter()],
    [],
  );
  return useMemo(() => {
    const hpIds = new Set(hpRows.map((row) => row.entityId));
    const allegianceById = new Map(
      allegianceRows.map((row) => [row.entityId, row.allegianceEntityId]),
    );
    return selectHostiles({
      viewer: playerEntity,
      viewerAllegianceId: playerAllegiance?.allegianceEntityId ?? null,
      cohabitants: cohabitantIds.map((entityId) => ({
        entityId,
        hasHp: hpIds.has(entityId),
        allegianceId: allegianceById.get(entityId) ?? null,
      })),
    });
  }, [playerEntity, playerAllegiance, cohabitantIds, hpRows, allegianceRows]);
};

export const useActionHotkey = (actionId: ActionId) => {
  const playerEntity = usePlayerEntity();
  const actionHotkeysComponent = useActionHotkeysComponent(playerEntity);
  if (actionHotkeysComponent == null) {
    return void 0;
  }

  const actionHotkey = actionHotkeysComponent.actionHotkeys.find(
    (actionHotkey) => actionHotkey.actionId === actionId,
  );
  if (actionHotkey == null) {
    return void 0;
  }

  return String.fromCharCode(actionHotkey.characterCode);
};

/** Presentation flags per entity, derived from component presence — the
 * server stores no ranking; prominence is pure client presentation. */
export const useEntityPresentations = (
  entityIds: EntityId[],
): EntityPresentation[] => {
  const pathRows = useTableData(
    "path_components",
    (table) => [...table.iter()],
    [],
  );
  const playerControllerRows = useTableData(
    "player_controller_components",
    (table) => [...table.iter()],
    [],
  );
  const hpRows = useTableData("hp_components", (table) => [...table.iter()], []);
  return useMemo(
    () =>
      selectEntityPresentations(
        {
          paths: { iter: () => pathRows },
          playerControllers: { iter: () => playerControllerRows },
          hps: { iter: () => hpRows },
        },
        entityIds,
      ),
    [entityIds, pathRows, playerControllerRows, hpRows],
  );
};

export const useLocationEntities = (locationEntityId: EntityId | null) => {
  return useTableData(
    "location_components",
    (table) => selectLocationEntities(table, locationEntityId),
    [locationEntityId],
  );
};

const usePlayerControllerComponent = () => {
  // Ownership hangs off the ACCOUNT, never the connection identity.
  const accountId = useMyAccountId();
  return useTableData(
    "player_controller_components",
    (table) => {
      if (accountId == null) {
        return null;
      }
      // TODO Remove "as any" cast after ranged index is correctly replaced with unique index in generated type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (table.account_id as any).find(accountId) ?? null;
    },
    [accountId],
  );
};

export const usePlayerEntity = (): EntityId | null => {
  const playerControllerComponent = usePlayerControllerComponent();
  if (playerControllerComponent == null) {
    return null;
  }

  return playerControllerComponent.entityId;
};

export const useAction = (id: ActionId | null) => useActionAsset(id);
