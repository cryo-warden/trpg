import { Identity } from "spacetimedb";
import { Account, LoginRequest } from "../../../stdb/types";
import { useStdbIdentity } from "./useStdb";
import { useTableData } from "./useTableData";

// The accounts layer: identities are per-connection/device, so everything
// durable hangs off accounts. These tables are public by design — a login
// request is visible to every attached device by construction, so no
// connection can be attached in secret. (Password HASHES live in a private
// server-only table and are never subscribed.)
export const accountQueries = [
  "select * from accounts",
  "select * from account_identities",
  "select * from login_requests",
  "select * from login_request_voters",
  "select * from login_responses",
  "select * from roles",
  "select * from account_roles",
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

/** The connected identity's account row, or null while unattached. */
export const useMyAccount = (): Account | null => {
  const accountId = useMyAccountId();
  return useTableData(
    "accounts",
    (table) => (accountId == null ? null : (table.id.find(accountId) ?? null)),
    [accountId],
  );
};

/** Whether my account holds the admin role. (The rotation gate is separate:
 * the server refuses privileged actions until the password is rotated.) */
export const useIsAdmin = (): boolean => {
  const accountId = useMyAccountId();
  const adminRoleId = useTableData(
    "roles",
    (table) =>
      [...table.iter()].find((role) => role.name === "admin")?.id ?? null,
    [],
  );
  return useTableData(
    "account_roles",
    (table) =>
      accountId != null &&
      adminRoleId != null &&
      [...table.iter()].some(
        (row) => row.accountId === accountId && row.roleId === adminRoleId,
      ),
    [accountId, adminRoleId],
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
