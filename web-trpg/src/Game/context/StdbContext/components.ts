import { useMemo } from "react";
import { RemoteTables, Action } from "../../../stdb";
import { ActionId, EntityId } from "../../trpg";
import { RowType } from "./RowType";
import { useStdbIdentity } from "./useStdb";
import { createUseTable } from "./useTable";
import { useTableData } from "./useTableData";
import { Target } from "../TargetContext";

const createUseComponent =
  <T extends keyof RemoteTables>(tableName: T) =>
  (entityId: EntityId | null): RowType<T> | null =>
    useTableData(
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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (table.entityId.find(entityId) as any) ?? null;
      },
      [entityId]
    );

export const componentQueries = [
  "select * from actions",
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

const useActionHotkeysComponent = createUseComponent("actionHotkeysComponents");
export const useActionStateComponent = createUseComponent(
  "actionStateComponents"
);
export const useActionsComponent = createUseComponent("actionsComponents");
export const useAttackComponent = createUseComponent("attackComponents");
export const useEpComponent = createUseComponent("epComponents");
export const useHpComponent = createUseComponent("hpComponents");
const useLocationComponent = createUseComponent("locationComponents");
export const useQueuedActionStateComponent = createUseComponent(
  "queuedActionStateComponents"
);

export const useAllegianceComponents = createUseTable("allegianceComponents");
export const useAppearanceFeaturesComponents = createUseTable(
  "appearanceFeaturesComponents"
);

const useAllegianceComponent = createUseComponent("allegianceComponents");
const usePathComponent = createUseComponent("pathComponents");

export const useLocation = (entityId: EntityId | null) => {
  const component = useLocationComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.locationEntityId;
};

export const useActionsMap = () =>
  useTableData(
    "actions",
    (table) => {
      const m = new Map<bigint, Action>();
      for (const row of table.iter()) {
        m.set(row.id, row);
      }
      return m;
    },
    []
  );

export const useActionOptions = (target: Target): ActionId[] => {
  const playerEntity = usePlayerEntity();
  const actionsComponent = useActionsComponent(playerEntity);

  const actionsMap = useActionsMap();
  const targetHp = useHpComponent(target);
  const playerAllegiance = useAllegianceComponent(playerEntity);
  const targetAllegiance = useAllegianceComponent(target);
  const targetPath = usePathComponent(target);

  return useMemo(() => {
    const actionIds = actionsComponent?.actionIds ?? [];

    const isAlly =
      playerEntity === target ||
      !!(
        playerAllegiance &&
        targetAllegiance &&
        playerAllegiance.allegianceEntityId ===
          targetAllegiance.allegianceEntityId
      );

    return actionIds.filter((aid) => {
      const action = actionsMap.get(aid as bigint);
      if (!action) return false;

      switch (action.actionType.tag) {
        case "Attack":
          return !!targetHp && !isAlly;
        case "Buff":
          return !!targetHp && isAlly;
        case "Move":
          return !!targetPath;
        case "Equip":
          return true;
        case "Inventory":
          return true;
        default:
          return false;
      }
    });
  }, [
    actionsComponent,
    actionsMap,
    playerEntity,
    targetHp,
    playerAllegiance,
    targetAllegiance,
    targetPath,
    target,
  ]);
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

export const useAction = (actionId: ActionId | null) =>
  useTableData(
    "actions",
    (table) => {
      if (actionId == null) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (table.id.find(actionId as any) as any) ?? null;
    },
    [actionId]
  );
