import {
  Context,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
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
  "select * from action_state_components",
  "select * from queued_action_state_components",
  "select * from location_components",
  "select * from hp_components",
  "select * from ep_components",
  "select * from player_controller_components",
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

type ComponentType<T extends keyof RemoteTables> = RemoteTables[T] extends {
  entityId: infer ID;
}
  ? ID extends { find: infer F }
    ? F extends (...args: any[]) => infer R
      ? Exclude<R, undefined>
      : never
    : never
  : never;

export type A = ComponentType<"hpComponents">;

export const useComponent =
  <T extends keyof RemoteTables>(table: T) =>
  (entityId: EntityId | null): ComponentType<T> | null => {
    const connection = useStdbConnection();

    if ((connection.db[table] as any).entityId == null) {
      throw new Error(
        `Table "${table}" used with useComponent does not have an entityId unique index.`
      );
    }

    const subscribe = useCallback(
      (refresh: () => void) => {
        connection.db[table].onInsert(refresh);
        if ("onUpdate" in connection.db[table]) {
          (connection.db[table].onUpdate as any)(refresh);
        }
        connection.db[table].onDelete(refresh);
        return () => {
          connection.db[table].removeOnInsert(refresh);
          if ("removeOnUpdate" in connection.db[table]) {
            (connection.db[table].removeOnUpdate as any)(refresh);
          }
          connection.db[table].removeOnDelete(refresh);
        };
      },
      [connection]
    );

    const component = useSyncExternalStore(subscribe, () =>
      entityId == null
        ? null
        : (connection.db[table] as any).entityId.find(entityId) ?? null
    );

    return component;
  };

export const usePlayerControllerComponent = () => {
  const connection = useStdbConnection();
  const identity = useStdbIdentity();

  const subscribe = useCallback(
    (refresh: () => void) => {
      connection.db.playerControllerComponents.onInsert(refresh);
      connection.db.playerControllerComponents.onUpdate(refresh);
      connection.db.playerControllerComponents.onDelete(refresh);
      return () => {
        connection.db.playerControllerComponents.removeOnInsert(refresh);
        connection.db.playerControllerComponents.removeOnUpdate(refresh);
        connection.db.playerControllerComponents.removeOnDelete(refresh);
      };
    },
    [connection]
  );

  const playerControllerComponent = useSyncExternalStore(
    subscribe,
    () =>
      connection.db.playerControllerComponents.identity.find(identity) ?? null
  );

  return playerControllerComponent;
};

export const usePlayerEntity = (): EntityId | null => {
  const playerControllerComponent = usePlayerControllerComponent();
  if (playerControllerComponent == null) {
    return null;
  }

  return playerControllerComponent.entityId;
};

export const useHpComponent = useComponent("hpComponents");

export const useEpComponent = useComponent("epComponents");

export const useLocationComponent = useComponent("locationComponents");

export const useActionStateComponent = useComponent("actionStateComponents");

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
  const connection = useStdbConnection();

  const subscribe = useCallback(
    (refresh: () => void) => {
      connection.db.locationComponents.onInsert(refresh);
      connection.db.locationComponents.onUpdate(refresh);
      connection.db.locationComponents.onDelete(refresh);
      return () => {
        connection.db.locationComponents.removeOnInsert(refresh);
        connection.db.locationComponents.removeOnUpdate(refresh);
        connection.db.locationComponents.removeOnDelete(refresh);
      };
    },
    [connection]
  );

  const entities = useMemo(
    () =>
      [...connection.db.locationComponents.iter()]
        .filter(
          (locationComponent) =>
            locationComponent.locationEntityId === locationEntityId
        )
        .map((locationComponent) => locationComponent.entityId),
    [connection, locationEntityId]
  );

  const entitiesSync = useSyncExternalStore(subscribe, () => entities);

  return entitiesSync;
};

export const useAllActions = () => {
  const connection = useStdbConnection();

  return [...connection.db.actions.iter()];
};

export const useActionName = (actionId: ActionId) => {
  const connection = useStdbConnection();

  const subscribe = useCallback(
    (refresh: () => void) => {
      connection.db.actionNames.onInsert(refresh);
      connection.db.actionNames.onUpdate(refresh);
      connection.db.actionNames.onDelete(refresh);
      return () => {
        connection.db.actionNames.removeOnInsert(refresh);
        connection.db.actionNames.removeOnUpdate(refresh);
        connection.db.actionNames.removeOnDelete(refresh);
      };
    },
    [connection]
  );

  const actionName = useSyncExternalStore(
    subscribe,
    () => connection.db.actionNames.actionId.find(actionId) ?? null
  );
  if (actionName == null) {
    return null;
  }

  return actionName.name;
};

export const useActionHotkey = (actionId: ActionId) => {
  const connection = useStdbConnection();
  const playerEntity = usePlayerEntity();

  const subscribe = useCallback(
    (refresh: () => void) => {
      connection.db.actionHotkeyComponents.onInsert(refresh);
      connection.db.actionHotkeyComponents.onDelete(refresh);
      return () => {
        connection.db.actionHotkeyComponents.removeOnInsert(refresh);
        connection.db.actionHotkeyComponents.removeOnDelete(refresh);
      };
    },
    [connection]
  );

  const actionHotkey = useSyncExternalStore(
    subscribe,
    () =>
      [...connection.db.actionHotkeyComponents.iter()]
        .filter(
          (actionHotkeyComponent) =>
            actionHotkeyComponent.entityId === playerEntity &&
            actionHotkeyComponent.actionId === actionId
        )
        .map((actionHotkeyComponent) =>
          String.fromCharCode(actionHotkeyComponent.characterCode)
        )[0] ?? null
  );

  return actionHotkey;
};
