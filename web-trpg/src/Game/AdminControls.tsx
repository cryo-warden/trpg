import { useState } from "react";
import { useIsAdmin } from "./context/StdbContext/account";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { pushProductionAssets } from "./init";

/**
 * Admin-only controls. Pushing assets is an explicit, privileged act — the
 * server enforces the admin role and password rotation — so the button
 * simply surfaces the server's verdict.
 */
export const AdminControls = () => {
  const connection = useStdbConnection();
  const isAdmin = useIsAdmin();
  const [status, setStatus] = useState<string | null>(null);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="admin-controls">
      <button
        onClick={() => {
          setStatus("Pushing assets…");
          pushProductionAssets(connection)
            .then(() => setStatus("Assets pushed."))
            .catch((reason) => setStatus(String(reason)));
        }}
      >
        Push assets
      </button>
      {status != null && <span className="status">{status}</span>}
    </div>
  );
};
