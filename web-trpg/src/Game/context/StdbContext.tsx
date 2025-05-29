import {
  Context,
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { DbConnection, RemoteTables } from "../../stdb";
import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { EntityId } from "../trpg";

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
  "select * from entities",
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

export const useLocation = (entityId: EntityId | null) => {
  const component = useLocationComponent(entityId);
  if (component == null) {
    return null;
  }

  return component.locationEntityId;
};
