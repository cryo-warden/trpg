/**
 * Dev publish bundles: publish a trpg database into a named, pre-made state
 * for rapid playtesting. Run via po (publish-dev-*) or directly:
 *
 *   bun scripts/dev-publish.ts <bare|seeded|combat|mapgen> [dbName]
 *
 * There is deliberately NO special initialization reducer: every bundle is a
 * composition of the real production flows (publish, bootstrap_admin, the
 * password claim + rotation, admin-gated pushes, admin provisioning), so dev
 * databases only ever contain states the production reducers can produce,
 * and the prod module surface carries nothing dev-only.
 *
 * Each non-bare bundle provisions a claimable playtest account
 * (name "dev", password "dev") — no identity attached, so the first browser
 * to log in with the password claims it and plays immediately.
 */
import type { DbConnection } from "../src/stdb";
import { claimAdmin } from "../e2e/admin";
import { connect } from "../e2e/client";
import { publishTestModule } from "../e2e/harness";
import { combatPack, mapGenPack } from "../e2e/testAssets";
import { pushProductionAssets } from "../src/Game/init";

const DEV_ADMIN_TOKEN = process.env.TRPG_ADMIN_TOKEN ?? "dev-admin-token";

const provisionDevAccount = async (admin: DbConnection): Promise<void> => {
  await admin.reducers.provisionAccount({
    name: "dev",
    password: "dev",
    requireRotation: false,
  });
  // The script's admin identity evaporates when it exits, so the claimable
  // playtest account doubles as the admin for this dev database.
  await admin.reducers.grantRole({ accountName: "dev", roleName: "admin" });
  console.log(
    'Playtest account ready: log in as "dev" with password "dev" (also admin).',
  );
};

/** Each bundle receives a freshly claimed admin connection. */
const BUNDLES: Record<string, (admin: DbConnection) => Promise<void>> = {
  /** Prod-like: admin bootstrapped and claimed, nothing else. */
  bare: async () => {},
  /** Production assets plus a claimable playtest account. */
  seeded: async (admin) => {
    await pushProductionAssets(admin);
    await provisionDevAccount(admin);
  },
  /** The combat scenario: a located enemy and a combat-ready player blob. */
  combat: async (admin) => {
    await admin.reducers.pushAssets({ assetPack: combatPack({}) });
    await provisionDevAccount(admin);
  },
  /** The map-generation scenario on the tiny fixed-seed test map. */
  mapgen: async (admin) => {
    await admin.reducers.pushAssets({ assetPack: mapGenPack() });
    await provisionDevAccount(admin);
  },
};

const [bundleName, dbName = "trpg"] = process.argv.slice(2);
const bundle = bundleName == null ? undefined : BUNDLES[bundleName];
if (bundle == null) {
  console.error(
    `Unknown bundle "${bundleName}". Available: ${Object.keys(BUNDLES).join(", ")}`,
  );
  process.exit(1);
}

publishTestModule(dbName);
const { connection } = await connect({ dbName });
await claimAdmin(connection, { token: DEV_ADMIN_TOKEN });
await bundle(connection);
console.log(`Published "${dbName}" in the "${bundleName}" state.`);
console.log(
  "The admin account is held by this script's identity; its rotated password" +
    " is the e2e default unless TRPG_ADMIN_TOKEN was set.",
);
connection.disconnect();
process.exit(0);
