import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { combatPack } from "./testAssets";

// Phase 4: combat, using a test-specific bundle (no production assets). Seed a
// player owned by the connecting identity and a co-located enemy, then attack
// and watch the enemy's hp fall through the real tick pipeline.

let player: DbConnection;

const enemyHp = (): number | undefined =>
  [...player.db.hp_components.iter()][0]?.hp;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  const { connection } = await connect();
  player = connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM hp_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM actions",
    ]);

  await player.reducers.pushAssets({ assetPack: combatPack({ enemyHp: 10 }) });
  await player.reducers.createAccount({ name: "fighter" });

  // The only entity with hp is the seeded enemy; the player controller is ours.
  await waitFor(() => player.db.hp_components.count() > 0, 30000);
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
}, 60000);

afterAll(() => {
  player?.disconnect();
});

test("attacking a co-located enemy reduces its hp", async () => {
  const enemyId = [...player.db.hp_components.iter()][0].entityId;
  const before = enemyHp();
  expect(before).toBe(10);

  // The proper backward conversion: resolve the action id from the subscribed
  // actions table by name, never by assuming an enumeration order.
  await waitFor(() => player.db.actions.count() > 0, 30000);
  const attackActionId = [...player.db.actions.iter()].find(
    (row) => row.name === "test_attack",
  )!.id;
  player.reducers.act({ actionId: attackActionId, targetEntityId: enemyId });

  await waitFor(() => (enemyHp() ?? 10) < 10, 30000);
  expect(enemyHp()).toBeLessThan(10);
});
