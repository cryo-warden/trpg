import { useEffect, useRef, useState } from "react";
import { Panel } from "../structural/Panel";
import {
  useStdbConnection,
  useStdbSynced,
} from "./context/StdbContext/useStdb";
import { useTableData } from "./context/StdbContext/useTableData";
import { pushProductionAssets } from "./init";

/**
 * DEV smooth entry: with TRPG_AUTO_ENTRY=true baked into the build, an
 * unattached connection creates a generated account immediately — no name
 * typed, no password — and the provisioning system mints its player
 * entity. The token persists, so a reload re-enters the SAME dev player;
 * clearing site storage yields a fresh one. The flag is strictly parsed:
 * absent means disabled (production builds simply do not carry it), any
 * value other than "true"/"false" renders as a configuration error.
 */
export const resolveAutoEntry = (): {
  enabled: boolean;
  configurationError: string | null;
} => {
  const raw: string | undefined = import.meta.env.TRPG_AUTO_ENTRY;
  if (raw == null || raw === "") {
    return { enabled: false, configurationError: null };
  }
  if (raw === "true" || raw === "false") {
    return { enabled: raw === "true", configurationError: null };
  }
  return {
    enabled: false,
    configurationError: `TRPG_AUTO_ENTRY must be "true" or "false"; got "${raw}".`,
  };
};

const newDevAccountName = (): string => {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return `dev_${values[0].toString(36)}`;
};

export const AutoEntryPanel = () => {
  const connection = useStdbConnection();
  // A new account is generated ONLY for an identity that truly has none:
  // wait for the initial sync to apply before reading "no account rows"
  // as an absence — a reconnecting identity must land on its existing
  // account. (The server independently enforces this: create_account
  // rejects any identity already attached.)
  const synced = useStdbSynced();
  const [name] = useState(newDevAccountName);
  const [error, setError] = useState<string | null>(null);
  const sentRef = useRef(false);
  const actionCount = useTableData(
    "actions",
    (table) => Number(table.count()),
    [],
  );

  useEffect(() => {
    if (!synced || sentRef.current) {
      return;
    }
    sentRef.current = true;
    // An EMPTY instance (no assets yet) has no admin coming to deliver
    // the bundle in this mode — bootstrap it ourselves. The server allows
    // exactly the first push without the admin role; without assets, no
    // player entity could ever provision.
    if (actionCount === 0) {
      pushProductionAssets(connection).catch((reason) =>
        setError(String(reason)),
      );
    }
    connection.reducers
      .createAccount({ name })
      .catch((reason) => setError(String(reason)));
  }, [synced, name, connection, actionCount]);

  return (
    <Panel className="account">
      <h2>Dev entry</h2>
      {error == null ? (
        <div>Entering as {name}…</div>
      ) : (
        <div className="error">{error}</div>
      )}
    </Panel>
  );
};
