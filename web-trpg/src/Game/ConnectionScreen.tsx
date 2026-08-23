import "./ConnectionScreen.css";
import { Panel } from "../structural/Panel";

/**
 * The pre-game screen: what the player sees before the database connection
 * exists — connecting, or a PROPER error with the address that failed and a
 * way to retry, never a blank page.
 */
export const ConnectionScreen = ({
  status,
  uri,
  detail,
}: {
  status: "connecting" | "error";
  /** The database address involved. */
  uri: string;
  /** The underlying failure, when there is one. */
  detail: string | null;
}) => (
  <div className="ConnectionScreen">
    <Panel className="connection">
      {status === "connecting" ? (
        <>
          <h2>Connecting…</h2>
          <div className="uri">{uri}</div>
        </>
      ) : (
        <>
          <h2>Cannot reach the game server</h2>
          <div className="uri">
            Tried to connect to <code>{uri}</code>
          </div>
          {detail != null && <div className="detail">{detail}</div>}
          <div className="hint">
            The server may be down or unreachable from your network.
          </div>
          <button onClick={() => window.location.reload()}>Retry</button>
        </>
      )}
    </Panel>
  </div>
);
