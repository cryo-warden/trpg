import { useMemo } from "react";
import { RemoteTables } from "../../../stdb";
import { ActionId, EntityId, EventId } from "../../trpg";
import { RowType } from "./RowType";
import { useStdbIdentity } from "./useStdb";
import { useTable } from "./useTable";
import { useTableData } from "./useTableData";

const useComponent =
  <T extends keyof RemoteTables>(tableName: T) =>
  (entityId: EntityId | null): RowType<T> | null => {
    return useTableData(
      tableName,
      (table): RowType<T> | null => {
        if (!("entityId" in table)) {
          throw new Error(
            `Table "${tableName}" used with useComponent does not have an entityId unique index.`
          );
        }

        if (entityId == null) {
          return null;
        }

        return (table.entityId.find(entityId) as any) ?? null;
      },
      [entityId]
    );
  };

export const componentQueries = [
  "select * from action_hotkeys_components",
  "select * from action_options_components",
  "select * from actions_components",
  "select * from action_state_components",
  "select * from allegiance_components",
  "select * from appearance_features_components",
  "select * from attack_components",
  "select * from entity_prominence_components",
  "select * from ep_components",
  "select * from hp_components",
  "select * from location_components",
  "select * from entity_observations",
  "select * from player_controller_components",
  "select * from queued_action_state_components",
  "select * from target_components",
];

const useActionHotkeysComponent = useComponent("actionHotkeysComponents");
export const useActionStateComponent = useComponent("actionStateComponents");
const useActionOptionsComponent = useComponent("actionOptionsComponents");
export const useAttackComponent = useComponent("attackComponents");
export const useEpComponent = useComponent("epComponents");
export const useHpComponent = useComponent("hpComponents");
const useLocationComponent = useComponent("locationComponents");
export const useQueuedActionStateComponent = useComponent(
  "queuedActionStateComponents"
);
const useTargetComponent = useComponent("targetComponents");

export const useAllegianceComponents = useTable("allegianceComponents");
export const useAppearanceFeaturesComponents = useTable(
  "appearanceFeaturesComponents"
);

export const useLocation = (entityId: EntityId | null) => {
  const component = useLocationComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.locationEntityId;
};

export const useActionOptions = (
  targetEntityId: EntityId | null
): ActionId[] => {
  const playerEntity = usePlayerEntity();
  const actionOptionsComponent = useActionOptionsComponent(playerEntity);
  return useMemo(
    () =>
      actionOptionsComponent?.actionOptions
        .filter(
          (actionOption) => actionOption.targetEntityId === targetEntityId
        )
        .map((actionOption) => actionOption.actionId) ?? [],
    [actionOptionsComponent, targetEntityId]
  );
};

export const useActionHotkey = (actionId: ActionId) => {
  const playerEntity = usePlayerEntity();
  const actionHotkeysComponent = useActionHotkeysComponent(playerEntity);
  if (actionHotkeysComponent == null) {
    return void 0;
  }

  const actionHotkey = actionHotkeysComponent.actionHotkeys.find(
    (actionHotkey) => actionHotkey.actionId === actionId
  );
  if (actionHotkey == null) {
    return void 0;
  }

  return String.fromCharCode(actionHotkey.characterCode);
};

export const useEntityProminences = (entityIds: EntityId[]) => {
  return useTableData(
    "entityProminenceComponents",
    (table) => {
      const m = new Map([...table.iter()].map((ep) => [ep.entityId, ep]));
      return entityIds.map((id) => {
        return m.get(id) ?? { entityId: id, prominence: -Infinity };
      });
    },
    [entityIds]
  );
};

export const useLocationEntities = (locationEntityId: EntityId | null) => {
  return useTableData(
    "locationComponents",
    (table) =>
      [...table.iter()]
        .filter(
          (locationComponent) =>
            locationComponent.locationEntityId === locationEntityId
        )
        .map((locationComponent) => locationComponent.entityId),
    [locationEntityId]
  );
};

export const useObserverComponentsObservableEventIds = (
  entityId: EntityId | null
): EventId[] => {
  return useTableData(
    "observerComponents",
    (table) =>
      entityId == null
        ? []
        : [...table.iter()]
            .filter((c) => c.entityId === entityId)
            .map((c) => c.observableEventId),
    [entityId]
  );
};

export const useTarget = (entityId: EntityId | null) => {
  const component = useTargetComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.targetEntityId;
};

const usePlayerControllerComponent = () => {
  const identity = useStdbIdentity();
  return useTableData(
    "playerControllerComponents",
    (table) => table.identity.find(identity) ?? null,
    [identity]
  );
};

export const usePlayerEntity = (): EntityId | null => {
  const playerControllerComponent = usePlayerControllerComponent();
  if (playerControllerComponent == null) {
    return null;
  }

  return playerControllerComponent.entityId;
};
