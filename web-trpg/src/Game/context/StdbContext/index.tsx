import { ReactNode, useMemo, useState } from "react";
import { SpacetimeDBProvider, useSpacetimeDB } from "spacetimedb/react";
import { DbConnection } from "../../../stdb";
import { accountQueries } from "./account";
import { assetQueries } from "./assetLookup";
import { componentQueries } from "./components";
import { gearQueries } from "./loadout";
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

// The database URI, DERIVED from the page — scheme follows the page's
// scheme (an https page gets wss; browsers refuse plain ws from a secure
// page as mixed content), host is whatever served the client, and the PORT
// is TRPG_STDB_PORT baked at build time: the SAME env var the cw manifest
// declares (vite.config's envPrefix exposes it), not a parallel VITE_*
// name. Deliberately NO default port: every build states which SpacetimeDB
// instance it dials (dev scripts pass 3000 explicitly; cw injects the prod
// value), and a build that forgot fails loudly — as a rendered error, not
// a blank page — instead of silently talking to the wrong database.
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

const resolveStdbUri = (): string => {
  const port: string | undefined = import.meta.env.TRPG_STDB_PORT;
  if (port == null || port === "") {
    throw new Error(
      "TRPG_STDB_PORT was not set at build time: this build does not know which SpacetimeDB instance to dial.",
    );
  }
  const scheme = window.location.protocol === "https:" ? "wss" : "ws";
  return `${scheme}://${window.location.hostname}:${port}`;
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
  // Resolved once, synchronously: a build that cannot name its database
  // renders as a configuration error rather than a blank page.
  const [resolved] = useState(() => {
    try {
      return { uri: resolveStdbUri(), configurationError: null };
    } catch (reason) {
      return { uri: null, configurationError: String(reason) };
    }
  });
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
    if (resolved.uri == null) {
      return null;
    }
    return DbConnection.builder()
      .withDatabaseName("trpg")
      .withToken(token)
      .withUri(resolved.uri)
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
  }, [resolved.uri, token]);

  if (builder == null) {
    return (
      <ConnectionScreen
        status="error"
        uri={resolved.uri}
        detail={resolved.configurationError}
      />
    );
  }

  return (
    <SpacetimeDBProvider connectionBuilder={builder}>
      <StdbGate uri={resolved.uri} syncedConnection={syncedConnection}>
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
  uri: string | null;
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
