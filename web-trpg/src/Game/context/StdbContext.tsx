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

type Status = "connecting" | "connected";

const queries = [
  "select * from entities",
  "select * from hp_components",
  "select * from player_controller_components",
];

export const WithStdb = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<Status>("connecting");
  const [connection, setConnection] = useState<DbConnection | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  // WIP Handle errors properly.
  useEffect(() => {
    DbConnection.builder()
      .withModuleName("trpg")
      .withToken(localStorage.getItem("auth_token") || "")
      .withUri("ws://localhost:3000")
      .onConnect((connection, identity, token) => {
        localStorage.setItem("auth_token", token);

        connection.subscriptionBuilder().subscribe(queries);

        setConnection(connection);
        setIdentity(identity);
        setStatus("connected");

        (window as any).dev = (window as any).dev || {};
        (window as any).dev.connection = connection;
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

export const useHpComponent = (entityId: EntityId) => {
  const connection = useStdbConnection();

  const subscribe = useCallback(
    (refresh: () => void) => {
      connection.db.hpComponents.onInsert(refresh);
      connection.db.hpComponents.onUpdate(refresh);
      connection.db.hpComponents.onDelete(refresh);
      return () => {
        connection.db.hpComponents.removeOnInsert(refresh);
        connection.db.hpComponents.removeOnUpdate(refresh);
        connection.db.hpComponents.removeOnDelete(refresh);
      };
    },
    [connection]
  );

  const hpComponent = useSyncExternalStore(
    subscribe,
    () => connection.db.hpComponents.entityId.find(entityId) ?? null
  );

  return hpComponent;
};

export const useComponent =
  (table: keyof RemoteTables) => (entityId: EntityId) => {
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

    const hpComponent = useSyncExternalStore(
      subscribe,
      () => (connection.db[table] as any).entityId.find(entityId) ?? null
    );

    return hpComponent;
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

// WIP Implement actual EP component.
export const useEpComponent = useComponent("hpComponents") as () => {
  ep?: number;
  mep?: number;
};
