import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { init } from "../src/Game/init";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";

// Phase 2: a small live world. Seed assets, then connect a fresh identity so
// identity_connected/new_player creates a player entity; the scheduled tick
// then applies its stats and places it in a generated room.

let seeder: DbConnection;
let player: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  seeder = await connect();
  seeder.subscriptionBuilder().subscribe(["SELECT * FROM actions"]);
  init(seeder);
  await waitFor(() => seeder.db.actions.count() > 0);

  // A fresh identity connecting after assets are loaded is auto-assigned a
  // player entity by new_player().
  player = await connect();
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM player_controller_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM location_components",
    ]);
}, 60000);

afterAll(() => {
  seeder?.disconnect();
  player?.disconnect();
});

const rowFor = <Row extends { entityId: bigint }>(
  rows: Iterable<Row>,
  entityId: bigint,
): Row | undefined => [...rows].find((row) => row.entityId === entityId);

test("a newly connected player is created with vitals and placed in the world", async () => {
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  const controller = [...player.db.player_controller_components.iter()][0];
  const entityId = controller.entityId;

  // The scheduled tick derives stats (hp) and places the player in a room.
  await waitFor(
    () => rowFor(player.db.hp_components.iter(), entityId) != null,
    30000,
  );
  await waitFor(
    () => rowFor(player.db.location_components.iter(), entityId) != null,
    30000,
  );

  expect(rowFor(player.db.hp_components.iter(), entityId)?.hp).toBeGreaterThan(0);
  expect(
    rowFor(player.db.location_components.iter(), entityId)?.locationEntityId,
  ).toBeGreaterThan(0n);
});
