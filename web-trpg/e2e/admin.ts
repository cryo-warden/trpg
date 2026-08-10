import type { DbConnection } from "../src/stdb";

/** The publish action's secret for the e2e world — plays the role of
 * TRPG_ADMIN_TOKEN in scripts/publish.sh. */
export const TEST_ADMIN_TOKEN = "e2e-admin-token";

export const ROTATED_ADMIN_PASSWORD = "e2e-rotated-password";

/**
 * Walks the full admin claim: bootstrap the admin account with the token as
 * its provisional password, claim it via password login (only possible while
 * no identity holds the account), then rotate — destroying the token's hash
 * and unlocking privileged actions for this connection.
 */
export const claimAdmin = async (connection: DbConnection): Promise<void> => {
  await connection.reducers.bootstrapAdmin({ adminToken: TEST_ADMIN_TOKEN });
  await connection.reducers.loginWithPassword({
    accountName: "admin",
    password: TEST_ADMIN_TOKEN,
  });
  await connection.reducers.setPassword({
    newPassword: ROTATED_ADMIN_PASSWORD,
  });
};
