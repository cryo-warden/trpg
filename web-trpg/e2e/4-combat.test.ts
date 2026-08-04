import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { ATTACK_ACTION_ID, combatPack } from "./testAssets";

// Phase 4: combat, using a test-specific bundle (no production assets). Seed a
// player owned by the connecting identity and a co-located enemy, then attack
// and watch the enemy's hp fall through the real tick pipeline.

let player: DbConnection;

const enemyHp = (): number | undefined =>
  [...player.db.hp_components.iter()][0]?.hp;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  const { connection, identity } = await connect();
  player = connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM hp_components",
      "SELECT * FROM player_controller_components",
    ]);

  player.reducers.pushAssets({ assetPack: combatPack(identity, { enemyHp: 10 }) });

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

  player.reducers.act({ actionId: ATTACK_ACTION_ID, targetEntityId: enemyId });

  await waitFor(() => (enemyHp() ?? 10) < 10, 30000);
  expect(enemyHp()).toBeLessThan(10);
});
