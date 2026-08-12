import { useEffect, useRef, useState } from "react";
import { useIsAdmin } from "./context/StdbContext/account";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { pushProductionAssets } from "./init";

/**
 * Admin session bootstrap: assets are pushed automatically when an admin
 * account attaches — the server still enforces the admin role and password
 * rotation, so this merely saves the tap (and stops a button from jostling
 * the mobile layout). Only a failure is surfaced.
 */
export const AdminControls = () => {
  const connection = useStdbConnection();
  const isAdmin = useIsAdmin();
  const [failure, setFailure] = useState<string | null>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!isAdmin || pushed.current) {
      return;
    }
    pushed.current = true;
    pushProductionAssets(connection).catch((reason) =>
      setFailure(String(reason)),
    );
  }, [isAdmin, connection]);

  if (failure == null) {
    return null;
  }

  return <div className="admin-controls error">Asset push failed: {failure}</div>;
};
