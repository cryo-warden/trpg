import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DbConnection, RemoteTables } from "../../stdb";
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { ActionId, EntityId } from "../trpg";

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

type ConnectionStatus = "connecting" | "connected" | "error";

const queries = [
  "select * from actions",
  "select * from action_steps",
  "select * from action_names",

  "select * from entities",
  "select * from action_hotkey_components",
  "select * from action_option_components",
  "select * from action_state_components",
  "select * from allegiance_components",
  "select * from ep_components",
  "select * from hp_components",
  "select * from location_components",
  "select * from player_controller_components",
  "select * from queued_action_state_components",
  "select * from target_components",

  "select * from entity_prominences",
];

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

type RowType<T extends keyof RemoteTables> = RemoteTables[T] extends {
  iter: () => Iterable<infer R>;
}
  ? R
  : never;

// In React hook deps, treat any empty array as the same empty array.
const emptyGuard: any = [];
const guardEmpty = <T,>(value: T): T => {
  if (Array.isArray(value) && value.length <= 0) {
    return emptyGuard;
  }
  return value;
};

export const useTableData = <
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

export const useTable = <T extends keyof RemoteTables>(tableName: T) => {
  return useTableData(
    tableName,
    (table): RowType<T>[] => [...table.iter()],
    []
  );
};

export const useTableSet = <T extends keyof RemoteTables>(tableName: T) => {
  return useTableData(
    tableName,
    (table): Set<RowType<T>> => new Set(...table.iter()),
    []
  );
};

export const useComponent =
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

export const useLocationComponent = useComponent("locationComponents");

export const useAllegianceComponent = useComponent("allegianceComponents");

export const useHpComponent = useComponent("hpComponents");

export const useEpComponent = useComponent("epComponents");

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

export const useAllegiance = (entityId: EntityId | null) => {
  const component = useAllegianceComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.allegianceEntityId;
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

export const useActionHotkey = (actionId: ActionId) => {
  const playerEntity = usePlayerEntity();

  return useTableData(
    "actionHotkeyComponents",
    (table) =>
      [...table.iter()]
        .filter(
          (actionHotkeyComponent) =>
            actionHotkeyComponent.entityId === playerEntity &&
            actionHotkeyComponent.actionId === actionId
        )
        .map((actionHotkeyComponent) =>
          String.fromCharCode(actionHotkeyComponent.characterCode)
        )[0] ?? null,
    [playerEntity, actionId]
  );
};

export const useActionOptions = (targetEntityId: EntityId | null) => {
  const playerEntity = usePlayerEntity();

  return useTableData(
    "actionOptionComponents",
    (table) =>
      [...table.iter()]
        .filter(
          (actionOptionComponent) =>
            actionOptionComponent.entityId === playerEntity &&
            actionOptionComponent.targetEntityId === targetEntityId
        )
        .map((actionOptionComponent) => actionOptionComponent.actionId),
    [targetEntityId, playerEntity]
  );
};

export const useEntityProminences = (entityIds: EntityId[]) => {
  return useTableData(
    "entityProminences",
    (table) => {
      const m = new Map([...table.iter()].map((ep) => [ep.entityId, ep]));
      return entityIds.map((id) => {
        return m.get(id) ?? { entityId: id, prominence: -Infinity };
      });
    },
    [entityIds]
  );
};
