import {
  Context,
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { DbConnection } from "../../stdb";
import { Identity } from "@clockworklabs/spacetimedb-sdk";

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

const queries = ["select * from entities", "select * from hp_components"];

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
