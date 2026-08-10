import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { playerPack } from "./testAssets";

// Phase 2: a small world under the accounts model (no production assets, no
// map generation). Creating an account creates the player entity from the
// pack's new-player blob, with vitals and a location.

let admin: DbConnection;
let player: DbConnection;

const rowFor = <Row extends { entityId: bigint }>(
  rows: Iterable<Row>,
  entityId: bigint,
): Row | undefined => [...rows].find((row) => row.entityId === entityId);

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: playerPack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM player_controller_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM location_components",
    ]);
  await player.reducers.createAccount({ name: "world_tester" });
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("a seeded player entity has vitals and a location", async () => {
  const entityId = [
    ...player.db.player_controller_components.iter(),
  ][0].entityId;
  await waitFor(
    () => rowFor(player.db.hp_components.iter(), entityId) != null,
    10000,
  );
  await waitFor(
    () => rowFor(player.db.location_components.iter(), entityId) != null,
    10000,
  );

  expect(rowFor(player.db.hp_components.iter(), entityId)?.hp).toBeGreaterThan(0);
  expect(
    rowFor(player.db.location_components.iter(), entityId)?.locationEntityId,
  ).toBeGreaterThan(0n);
});
