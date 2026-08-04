import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { playerPack } from "./testAssets";

// Phase 2: a small world seeded directly (no production assets, no new_player /
// map generation). A player entity owned by the connecting identity is present
// with vitals and a location.

let player: DbConnection;

const rowFor = <Row extends { entityId: bigint }>(
  rows: Iterable<Row>,
  entityId: bigint,
): Row | undefined => [...rows].find((row) => row.entityId === entityId);

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  const { connection, identity } = await connect();
  player = connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM player_controller_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM location_components",
    ]);
  player.reducers.pushAssets({ assetPack: playerPack(identity) });
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
}, 60000);

afterAll(() => {
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
