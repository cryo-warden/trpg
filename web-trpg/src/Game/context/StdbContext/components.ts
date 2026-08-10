import { useMemo } from "react";
import { getActionOptions } from "../../domain/actionOptions";
import { ActionId, EntityId } from "../../trpg";
import { useMyAccountId } from "./account";
import { useActionAsset, useActionAssetOf } from "./assetLookup";
import { RowType } from "./RowType";
import { createUseTable } from "./useTable";
import { RemoteTables, useTableData } from "./useTableData";
import {
  selectEntityProminences,
  selectLocationEntities,
} from "./tableSelectors";
import { Target } from "../TargetContext";

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
  "select * from entity_prominence_components",
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

export const useActionOptions = (target: Target): ActionId[] => {
  const playerEntity = usePlayerEntity();
  const actionsComponent = useActionsComponent(playerEntity);
  const actionAssetOf = useActionAssetOf();

  const targetHp = useHpComponent(target);
  const playerAllegiance = useAllegianceComponent(playerEntity);
  const targetAllegiance = useAllegianceComponent(target);
  const targetPath = usePathComponent(target);

  return useMemo(
    () =>
      getActionOptions({
        actionIds: actionsComponent?.actionIds ?? [],
        actionAssetOf,
        targetHasHp: !!targetHp,
        targetHasPath: !!targetPath,
        playerEntity,
        target,
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
      target,
    ],
  );
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

export const useEntityProminences = (entityIds: EntityId[]) => {
  return useTableData(
    "entity_prominence_components",
    (table) => selectEntityProminences(table, entityIds),
    [entityIds],
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
