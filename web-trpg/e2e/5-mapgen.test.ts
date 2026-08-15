import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { mapGenPack } from "./testAssets";

// Phase 5: exercise the real new_player + map-generation flow on a tiny
// test-specific map (fixed rng seed, minimal theme). A fresh client is placed
// into a freshly generated room/path graph.

let seeder: DbConnection;
let player: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  seeder = (await connect()).connection;
  seeder.subscriptionBuilder().subscribe(["SELECT * FROM actions"]);
  await claimAdmin(seeder);
  await seeder.reducers.pushAssets({ assetPack: mapGenPack() });
  await waitFor(() => seeder.db.actions.count() > 0);

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM player_controller_components",
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
      "SELECT * FROM allegiance_components",
      "SELECT * FROM named_entities",
      "SELECT * FROM appearance_features",
      "SELECT * FROM appearance_features_components",
    ]);
  await player.reducers.createAccount({ name: "explorer" });
}, 60000);

afterAll(() => {
  seeder?.disconnect();
  player?.disconnect();
});

test("new_player + map generation builds a room/path graph and places the player", async () => {
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  const entityId = [
    ...player.db.player_controller_components.iter(),
  ][0].entityId;

  // The generated map yields connecting paths, and the player is placed in it.
  await waitFor(() => player.db.path_components.count() > 0, 30000);
  await waitFor(
    () =>
      [...player.db.location_components.iter()].some(
        (row) => row.entityId === entityId,
      ),
    30000,
  );

  expect(player.db.path_components.count()).toBeGreaterThan(0);
}, 40000);

test("generated paths receive a rolled variation feature", async () => {
  // The theme's pool forces exactly one variation (test_winding) onto every
  // path, so every generated path must carry that feature index.
  await waitFor(() => player.db.appearance_features.count() > 0, 30000);
  const windingIndex = [...player.db.appearance_features.iter()].find(
    (row) => row.name === "test_winding",
  )?.index;
  expect(windingIndex).toBeDefined();

  await waitFor(() => player.db.path_components.count() > 0, 30000);
  const pathEntityIds = new Set(
    [...player.db.path_components.iter()].map((row) => row.entityId),
  );

  const pathCarriesWinding = () =>
    [...player.db.appearance_features_components.iter()].some(
      (row) =>
        pathEntityIds.has(row.entityId) &&
        [...row.appearanceFeatureIndexes].includes(windingIndex!),
    );
  await waitFor(pathCarriesWinding, 30000);
  expect(pathCarriesWinding()).toBe(true);
}, 40000);

test("the new player's allegiance resolved through the Named selector", async () => {
  const entityId = [
    ...player.db.player_controller_components.iter(),
  ][0].entityId;

  await waitFor(
    () =>
      [...player.db.allegiance_components.iter()].some(
        (row) => row.entityId === entityId,
      ),
    30000,
  );

  const allegianceEntityId = [...player.db.allegiance_components.iter()].find(
    (row) => row.entityId === entityId,
  )?.allegianceEntityId;
  const registered = [...player.db.named_entities.iter()].find(
    (row) => row.name === "allegiance1",
  );
  expect(registered).toBeDefined();
  expect(allegianceEntityId).toBe(registered!.entityId);
}, 40000);
