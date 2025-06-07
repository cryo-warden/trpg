import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DbConnection, EntityEvent, RemoteTables } from "../../stdb";
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { ActionId, EntityId, EventId } from "../trpg";

export type StdbContext = Context<{
  connection: DbConnection;
  identity: Identity;
}>;

export const StdbContext: StdbContext = createContext(null as any);

export const useStdbConnection = () => {
  const { connection } = useContext(StdbContext);
  return connection;
};

export const useStdbIdentity = () => {
  const { identity } = useContext(StdbContext);
  return identity;
};

const queries = [
  // Action Queries
  "select * from actions",
  "select * from action_steps",
  "select * from action_names",

  // Rendering Queries
  "select * from observable_events",
  "select * from appearance_features",

  // Component Queries
  "select * from entities",
  "select * from action_hotkeys_components",
  "select * from action_options_components",
  "select * from actions_components",
  "select * from action_state_components",
  "select * from allegiance_components",
  "select * from ep_components",
  "select * from hp_components",
  "select * from attack_components",
  "select * from location_components",
  "select * from player_controller_components",
  "select * from queued_action_state_components",
  "select * from target_components",
  "select * from entity_prominence_components",
  "select * from observer_components",
  "select * from appearance_features_components",
];

type ConnectionStatus = "connecting" | "connected" | "error";

export const WithStdb = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [connection, setConnection] = useState<DbConnection | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    DbConnection.builder()
      .withModuleName("trpg")
      .withToken(localStorage.getItem("auth_token") || "")
      .withUri("ws://localhost:3000") // TODO Use process arg.
      .onConnect((connection, identity, token) => {
        localStorage.setItem("auth_token", token);

        connection.subscriptionBuilder().subscribe(queries);

        setConnection(connection);
        setIdentity(identity);
        setStatus("connected");

        (window as any).dev = (window as any).dev || {};
        (window as any).dev.connection = connection;
      })
      .onConnectError((error) => {
        setConnection(null);
        setIdentity(null);
        setStatus("error");
        console.error(error);
      })
      .build();
  }, []);

  if (status === "connected" && connection != null && identity != null) {
    return (
      <StdbContext.Provider value={{ connection, identity }}>
        {children}
      </StdbContext.Provider>
    );
  }

  // TODO Render connectingChildren and connectionErrorChildren.
  return null;
};

// In React hook deps, treat any empty array as the same empty array.
const emptyGuard: any = [];
const guardEmpty = <T,>(value: T): T => {
  if (Array.isArray(value) && value.length <= 0) {
    return emptyGuard;
  }
  return value;
};

const useTableData = <
  T extends keyof RemoteTables,
  F extends (table: RemoteTables[T]) => any
>(
  tableName: T,
  compute: F,
  deps: any[]
): ReturnType<F> => {
  const connection = useStdbConnection();
  const [result, setResult] = useState(() => compute(connection.db[tableName]));

  useEffect(() => {
    const refresh = () => {
      setResult(compute(connection.db[tableName]));
    };
    refresh();
    connection.db[tableName].onInsert(refresh);
    connection.db[tableName].onDelete(refresh);
    if ("onUpdate" in connection.db[tableName]) {
      connection.db[tableName].onUpdate(refresh);
    }
    return () => {
      connection.db[tableName].removeOnInsert(refresh);
      connection.db[tableName].removeOnDelete(refresh);
      if ("removeOnUpdate" in connection.db[tableName]) {
        connection.db[tableName].removeOnUpdate(refresh);
      }
    };
  }, [connection, setResult, ...deps.map(guardEmpty)]);

  return result;
};

type RowType<T extends keyof RemoteTables> = RemoteTables[T] extends {
  iter: () => Iterable<infer R>;
}
  ? R
  : never;

const useTable =
  <T extends keyof RemoteTables>(tableName: T) =>
  () => {
    return useTableData(
      tableName,
      (table): RowType<T>[] => [...table.iter()] as any,
      []
    );
  };

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

export type Id = Extract<
  RemoteTables[keyof RemoteTables],
  { id: any }
>["id"]["find"] extends (id: infer ID) => any
  ? ID
  : never;

// const useRow =
//   <T extends keyof RemoteTables>(tableName: T) =>
//   (id: Id | null): RowType<T> | null => {
//     return useTableData(
//       tableName,
//       (table): RowType<T> | null => {
//         if (!("id" in table)) {
//           throw new Error(
//             `Table "${tableName}" used with useRow does not have an id unique index.`
//           );
//         }

//         if (id == null) {
//           return null;
//         }

//         return (table.id.find(id) as any) ?? null;
//       },
//       [id]
//     );
//   };

export const useObservableEvents = useTable("observableEvents");

export const usePlayerControllerComponent = () => {
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

const useLocationComponent = useComponent("locationComponents");

export const useHpComponent = useComponent("hpComponents");

export const useEpComponent = useComponent("epComponents");

export const useAttackComponent = useComponent("attackComponents");

export const useActionStateComponent = useComponent("actionStateComponents");

export const useTargetComponent = useComponent("targetComponents");

export const useTarget = (entityId: EntityId | null) => {
  const component = useTargetComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.targetEntityId;
};

export const useQueuedActionStateComponent = useComponent(
  "queuedActionStateComponents"
);

export const useLocation = (entityId: EntityId | null) => {
  const component = useLocationComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.locationEntityId;
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

export const useActionName = (actionId: ActionId) => {
  return useTableData(
    "actionNames",
    (table) => table.actionId.find(actionId)?.name ?? null,
    [actionId]
  );
};

const useActionHotkeysComponent = useComponent("actionHotkeysComponents");

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

const useActionOptionsComponent = useComponent("actionOptionsComponents");

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

export const useAppearanceFeatures = useTable("appearanceFeatures");
export const useAppearanceFeaturesComponents = useTable(
  "appearanceFeaturesComponents"
);
export const useAllegianceComponents = useTable("allegianceComponents");
export const useActions = useTable("actions");

const useObserverComponentsObservableEventIds = (
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

export const useObserverComponentsEvents = (
  entityId: EntityId | null
): EntityEvent[] => {
  const eventIds = useObserverComponentsObservableEventIds(entityId);
  const observableEvents = useObservableEvents();
  const idToObservableEvent = useMemo(
    () => new Map(observableEvents.map((e) => [e.id, e])),
    [observableEvents]
  );
  const events = useMemo(
    () =>
      eventIds
        .map((id) => idToObservableEvent.get(id))
        .filter((e) => e != null),
    [eventIds, idToObservableEvent]
  );
  return events;
};
