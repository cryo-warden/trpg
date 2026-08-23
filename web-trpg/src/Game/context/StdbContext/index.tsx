import { ReactNode, useMemo, useState } from "react";
import { SpacetimeDBProvider, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection } from "../../../stdb";
import { accountQueries } from "./account";
import { assetQueries } from "./assetLookup";
import { componentQueries } from "./components";
import { gearQueries } from "./customization";
import { renderingQueries } from "./rendering";
import { StdbContext } from "./StdbContext";
import { describeConnectionError } from "./connectionErrorText";
import { ConnectionScreen } from "../../ConnectionScreen";
import { pushProductionAssets } from "../../init";

const queries = [
  ...renderingQueries,
  ...componentQueries,
  ...assetQueries,
  ...gearQueries,
  ...accountQueries,
];

// TODO Move dev code behind compilation flags.
const installDevHooks = (connection: DbConnection): void => {
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
};

// The database URI. By default it is SAME-ORIGIN: scheme follows the page's
// scheme (an https page gets wss; browsers refuse plain ws from a secure
// page as mixed content), and host:port is whatever served the client — the
// web server relays every /v1 request to the actual SpacetimeDB instance
// (vite.config's proxy, dev and preview alike). Same-origin is what lets one
// client work identically from the LAN and from the public tunnel, which
// carries only 443 and could never reach a separate database port.
//
// TRPG_STDB_URI, baked at build time (vite.config's envPrefix exposes it),
// overrides the default with a full base URI — for when the backend moves to
// its own domain instead of riding the page's origin. Either way the
// trailing slash matters: the SDK resolves its v1/... endpoints RELATIVE to
// this URI, and without the slash the base's last path segment is dropped.
const resolveStdbUri = (): string => {
  const override: string | undefined = import.meta.env.TRPG_STDB_URI;
  if (override != null && override !== "") {
    return override.endsWith("/") ? override : `${override}/`;
  }
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.host}/`;
};

/**
 * Connection lifecycle is the SDK ConnectionManager's job (via
 * SpacetimeDBProvider): exponential-backoff auto-reconnect, tab-refocus and
 * network-return revival, and detection of sockets that died silently while
 * the tab was frozen — the idle cases a hand-rolled onDisconnect loop never
 * hears about. This layer only decides what the player SEES: the error view
 * is reserved for a fresh connection attempt actually failing
 * (connectionError set); an established connection dropping quietly shows
 * the connecting view while the manager retries behind it.
 */
export const WithStdb = ({ children }: { children: ReactNode }) => {
  // Resolved once, synchronously, from the page's own location.
  const [uri] = useState(resolveStdbUri);
  // The token lives in state so the builder REBUILDS when the server issues
  // one: the manager reuses the retained builder for every auto-reconnect,
  // and a builder frozen with the first render's (possibly empty) token
  // would reconnect as a brand-new identity — silently logging the player
  // out. retain() swaps the stored builder without touching the live
  // connection.
  const [token, setToken] = useState(
    () => localStorage.getItem("auth_token") || "",
  );
  // WHICH connection has finished its initial subscription sync. Keyed by
  // the connection object so a reconnect (a fresh connection) reads as
  // unsynced until its own sync applies — before that, absent rows mean
  // "not loaded yet", never "does not exist".
  const [syncedConnection, setSyncedConnection] = useState<DbConnection | null>(
    null,
  );

  const builder = useMemo(() => {
    return DbConnection.builder()
      .withDatabaseName("trpg")
      .withToken(token)
      .withUri(uri)
      .onConnect((connection, _identity, freshToken) => {
        localStorage.setItem("auth_token", freshToken);
        setToken(freshToken);

        // Re-fires on every rebuilt connection: subscriptions come back
        // after each reconnect without extra bookkeeping.
        connection
          .subscriptionBuilder()
          .onApplied(() => setSyncedConnection(connection))
          .subscribe(queries);
        installDevHooks(connection);
      });
  }, [uri, token]);

  return (
    <SpacetimeDBProvider connectionBuilder={builder}>
      <StdbGate uri={uri} syncedConnection={syncedConnection}>
        {children}
      </StdbGate>
    </SpacetimeDBProvider>
  );
};

const StdbGate = ({
  uri,
  syncedConnection,
  children,
}: {
  uri: string;
  syncedConnection: DbConnection | null;
  children: ReactNode;
}) => {
  const state = useSpacetimeDB();
  const connection = state.getConnection() as DbConnection | null;

  if (state.isActive && state.identity != null && connection != null) {
    return (
      <StdbContext.Provider
        value={{
          connection,
          identity: state.identity,
          synced: connection === syncedConnection,
        }}
      >
        {children}
      </StdbContext.Provider>
    );
  }

  return (
    <ConnectionScreen
      status={state.connectionError != null ? "error" : "connecting"}
      uri={uri}
      detail={
        state.connectionError == null
          ? null
          : describeConnectionError(state.connectionError)
      }
    />
  );
};
