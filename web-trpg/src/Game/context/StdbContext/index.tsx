import { Identity } from "spacetimedb";
import { ReactNode, useEffect, useState } from "react";
import { DbConnection } from "../../../stdb";
import { accountQueries } from "./account";
import { assetQueries } from "./assetLookup";
import { componentQueries } from "./components";
import { gearQueries } from "./loadout";
import { renderingQueries } from "./rendering";
import { StdbContext } from "./StdbContext";
import { pushProductionAssets } from "../../init";

const queries = [
  ...renderingQueries,
  ...componentQueries,
  ...assetQueries,
  ...gearQueries,
  ...accountQueries,
];

type ConnectionStatus = "connecting" | "connected" | "error";

// The database URI, DERIVED from the page — scheme follows the page's
// scheme (an https page gets wss; browsers refuse plain ws from a secure
// page as mixed content), host is whatever served the client, and the PORT
// is TRPG_STDB_PORT baked at build time: the SAME env var the cw manifest
// declares (vite.config's envPrefix exposes it), not a parallel VITE_*
// name. Deliberately NO default port: every build states which SpacetimeDB
// instance it dials (dev scripts pass 3000 explicitly; cw injects the prod
// value), and a build that forgot fails loudly right here instead of
// silently talking to the wrong database.
const STDB_URI: string = (() => {
  const port: string | undefined = import.meta.env.TRPG_STDB_PORT;
  if (port == null || port === "") {
    throw new Error(
      "TRPG_STDB_PORT was not set at build time: this build does not know which SpacetimeDB instance to dial.",
    );
  }
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.hostname}:${port}`;
})();

export const WithStdb = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [connection, setConnection] = useState<DbConnection | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);

  useEffect(() => {
    DbConnection.builder()
      .withDatabaseName("trpg")
      .withToken(localStorage.getItem("auth_token") || "")
      .withUri(STDB_URI)
      .onConnect((connection, identity, token) => {
        localStorage.setItem("auth_token", token);

        connection.subscriptionBuilder().subscribe(queries);

        setConnection(connection);
        setIdentity(identity);
        setStatus("connected");

        // TODO Move dev code behind compilation flags.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dev = (window as any).dev || {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dev.connection = connection;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dev.pushAssets = () => pushProductionAssets(connection);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).dev.getAll = () => {
          return Object.fromEntries(
            Object.entries(connection.db).map(([key, value]) => [
              key,
              [...value.iter()],
            ]),
          );
        };
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
