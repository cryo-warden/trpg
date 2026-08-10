import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { graphPack } from "./testAssets";

// Phase 3: a direct-seeded world graph (no production assets, no map generator).
// Located occupants and a connecting path materialize on the instance.

let world: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  world = (await connect()).connection;
  world
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
    ]);
  await claimAdmin(world);
  await world.reducers.pushAssets({ assetPack: graphPack() });
  await waitFor(() => world.db.path_components.count() > 0, 30000);
}, 60000);

afterAll(() => {
  world?.disconnect();
});

test("a seeded world has located occupants and a connecting path", () => {
  expect(world.db.path_components.count()).toBeGreaterThan(0);
  expect(world.db.location_components.count()).toBeGreaterThan(1);
});
