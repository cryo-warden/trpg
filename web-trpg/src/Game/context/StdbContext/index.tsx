import { Identity } from "@clockworklabs/spacetimedb-sdk";
import { ReactNode, useEffect, useState } from "react";
import { DbConnection } from "../../../stdb";
import { componentQueries } from "./components";
import { renderingQueries } from "./rendering";
import { StdbContext } from "./StdbContext";

const queries = [...renderingQueries, ...componentQueries];

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

        // TODO Move dev code behind compilation flags.
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
