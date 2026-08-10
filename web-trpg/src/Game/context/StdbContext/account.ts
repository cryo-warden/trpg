import { Identity } from "spacetimedb";
import { LoginRequest } from "../../../stdb/types";
import { useStdbIdentity } from "./useStdb";
import { useTableData } from "./useTableData";

// The accounts layer: identities are per-connection/device, so everything
// durable hangs off accounts. These tables are public by design — a login
// request is visible to every attached device by construction, so no
// connection can be attached in secret.
export const accountQueries = [
  "select * from accounts",
  "select * from account_identities",
  "select * from login_requests",
  "select * from login_request_voters",
  "select * from login_responses",
];

const sameIdentity = (a: Identity, b: Identity): boolean =>
  a === b || (typeof a.isEqual === "function" && a.isEqual(b));

/** The connected identity's account id, or null while unattached. */
export const useMyAccountId = (): bigint | null => {
  const identity = useStdbIdentity();
  return useTableData(
    "account_identities",
    (table) => table.identity.find(identity)?.accountId ?? null,
    [identity],
  );
};

/** The unattached requester's view: its own latest login request, if any. */
export const useMyLoginRequest = (): LoginRequest | null => {
  const identity = useStdbIdentity();
  return useTableData(
    "login_requests",
    (table) =>
      [...table.iter()]
        .filter((request) => sameIdentity(request.identity, identity))
        .at(-1) ?? null,
    [identity],
  );
};

/**
 * The attached voter's view: pending login requests on my account that I have
 * not yet responded to. These demand a decision — accept or refuse.
 */
export const usePendingLoginRequests = (): LoginRequest[] => {
  const identity = useStdbIdentity();
  const accountId = useMyAccountId();
  const pending = useTableData(
    "login_requests",
    (table) =>
      accountId == null
        ? []
        : [...table.iter()].filter(
            (request) =>
              request.accountId === accountId &&
              request.status.tag === "Pending",
          ),
    [accountId],
  );
  const respondedIds = useTableData(
    "login_responses",
    (table) =>
      new Set(
        [...table.iter()]
          .filter((response) => sameIdentity(response.identity, identity))
          .map((response) => response.loginRequestId),
      ),
    [identity],
  );
  return pending.filter((request) => !respondedIds.has(request.id));
};
