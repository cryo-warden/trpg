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

// The database URI: explicit override first, else DERIVED from the page
// itself — the scheme follows the page's scheme (an https page gets wss;
// browsers refuse plain ws from a secure page as mixed content) and the
// host is whatever served the client, so localhost, LAN, and the public
// domain all work with no per-device configuration. The PORT alone is
// overridable (VITE_STDB_PORT, baked at build): production runs its own
// separate SpacetimeDB instance on a different port.
const STDB_URI: string =
  import.meta.env.VITE_STDB_URI ??
  `${window.location.protocol === "https:" ? "wss" : "ws"}://${
    window.location.hostname
  }:${import.meta.env.VITE_STDB_PORT ?? "3000"}`;

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
