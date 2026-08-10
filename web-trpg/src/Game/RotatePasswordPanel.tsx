import { useState } from "react";
import { Panel } from "../structural/Panel";
import { useStdbConnection } from "./context/StdbContext/useStdb";

/**
 * The rotation enforcement screen: while an account's password is a
 * provisional secret (e.g. the publish-time admin token), the server refuses
 * privileged actions and this screen blocks everything else. Rotating
 * overwrites the stored hash, so the provisional credential ceases to exist.
 */
export const RotatePasswordPanel = () => {
  const connection = useStdbConnection();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Panel className="account">
      <h2>Set a new password</h2>
      <p>
        This account was claimed with a provisional secret. Choose a new
        password to destroy the old credential and unlock the account.
      </p>
      {error != null && <div className="error">{error}</div>}
      <input
        aria-label="new password"
        type="password"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
      />
      <button
        onClick={() => {
          setError(null);
          connection.reducers
            .setPassword({ newPassword })
            .catch((reason) => setError(String(reason)));
        }}
      >
        Rotate password
      </button>
    </Panel>
  );
};
