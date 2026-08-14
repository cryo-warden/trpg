import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { pushProductionAssets } from "../src/Game/init";
import { ACTIONS } from "../src/Game/assets/actions";
import { STANCES } from "../src/Game/assets/stances";

// Phase 8: the production content itself. Every cross-reference in the
// authored Records (action names in stat blocks, stance/armament/baseline
// names in blobs, encounter and connection names in maps) resolves only
// inside push_assets — so the real pack must round-trip against a fresh
// instance or a typo ships silently.

let admin: DbConnection;
let bootstrapper: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();
  bootstrapper = (await connect()).connection;
  admin = (await connect()).connection;
  await claimAdmin(admin);
  admin
    .subscriptionBuilder()
    .subscribe(["SELECT * FROM actions", "SELECT * FROM stances"]);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  bootstrapper?.disconnect();
});

test("an EMPTY instance accepts its bootstrap push from ANY connection", async () => {
  // No admin role on this connection: the first push is deliberately open
  // (auto-entry deployments have no admin coming to deliver the bundle),
  // and the window closes the moment assets exist.
  await pushProductionAssets(bootstrapper);
  await waitFor(
    () => admin.db.actions.count() === BigInt(Object.keys(ACTIONS).length),
    30000,
  );
  await waitFor(
    () => admin.db.stances.count() === BigInt(Object.keys(STANCES).length),
    30000,
  );
  expect(admin.db.actions.count()).toBe(BigInt(Object.keys(ACTIONS).length));
  expect(admin.db.stances.count()).toBe(BigInt(Object.keys(STANCES).length));
});

test("UPDATES are admin-only; an identical admin push is a clean increment", async () => {
  // The bootstrapper is now an ordinary ACCOUNT-HOLDING player (exactly
  // the auto-entry shape) — and still may not update.
  await bootstrapper.reducers.createAccount({ name: "bootstrapper" });
  await expect(pushProductionAssets(bootstrapper)).rejects.toThrow(/admin/i);
  await pushProductionAssets(admin);
  expect(admin.db.actions.count()).toBe(BigInt(Object.keys(ACTIONS).length));
});
