import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { minimalPack } from "./testAssets";

// Phase 1: seed a real instance with a tiny, test-specific bundle (not the
// production assets) and confirm it lands. Just the connect + push_assets round
// trip — no world, no ticks.

let connection: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();
  connection = (await connect()).connection;
  connection.subscriptionBuilder().subscribe(["SELECT * FROM actions"]);
}, 60000);

afterAll(() => {
  connection?.disconnect();
});

test("pushing a minimal asset bundle populates the action catalog", async () => {
  connection.reducers.pushAssets({ assetPack: minimalPack() });
  await waitFor(() => connection.db.actions.count() > 0);
  expect(connection.db.actions.count()).toBeGreaterThan(0);
});
