import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { init } from "../src/Game/init";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";

// Phase 3: a larger scenario. When a player is placed, the map generator builds
// a room/path graph for the map's fixed rng seed. Assert the world materializes
// with rooms and connecting paths.

let seeder: DbConnection;
let player: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  seeder = (await connect()).connection;
  seeder.subscriptionBuilder().subscribe(["SELECT * FROM actions"]);
  init(seeder);
  await waitFor(() => seeder.db.actions.count() > 0);

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM player_controller_components",
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
    ]);
}, 60000);

afterAll(() => {
  seeder?.disconnect();
  player?.disconnect();
});

test("placing a player generates a map with rooms and connecting paths", async () => {
  // Player is placed once the map has been generated.
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  const entityId = [
    ...player.db.player_controller_components.iter(),
  ][0].entityId;
  await waitFor(
    () =>
      [...player.db.location_components.iter()].some(
        (row) => row.entityId === entityId,
      ),
    30000,
  );

  // The generated map is a graph: multiple located entities and directed paths.
  await waitFor(() => player.db.path_components.count() > 0, 30000);
  expect(player.db.path_components.count()).toBeGreaterThan(0);
  expect(player.db.location_components.count()).toBeGreaterThan(1);
});
