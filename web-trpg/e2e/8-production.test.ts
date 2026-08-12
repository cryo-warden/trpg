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

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();
  admin = (await connect()).connection;
  await claimAdmin(admin);
  admin
    .subscriptionBuilder()
    .subscribe(["SELECT * FROM actions", "SELECT * FROM stances"]);
}, 60000);

afterAll(() => {
  admin?.disconnect();
});

test("the production asset pack pushes cleanly", async () => {
  await pushProductionAssets(admin);
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

test("a second identical push is a clean incremental update", async () => {
  await pushProductionAssets(admin);
  expect(admin.db.actions.count()).toBe(BigInt(Object.keys(ACTIONS).length));
});
