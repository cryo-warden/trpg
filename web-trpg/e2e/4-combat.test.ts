import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { combatPack } from "./testAssets";

// Phase 4: combat, using a test-specific bundle (no production assets). Seed a
// player owned by the connecting identity and a co-located enemy, then attack
// and watch the enemy's hp fall through the real tick pipeline.

let admin: DbConnection;
let player: DbConnection;

// The enemy is the entity WITH an enemy controller — never "hp row [0]":
// every account (the e2e admin's included) gets an auto-provisioned player,
// and players carry hp too.
const enemyId = (): bigint | undefined =>
  [...player.db.enemy_controller_components.iter()][0]?.entityId;

const enemyHp = (): number | undefined =>
  [...player.db.hp_components.iter()].find(
    (row) => row.entityId === enemyId(),
  )?.hp;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: combatPack({ enemyHp: 10 }) });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM hp_components",
      "SELECT * FROM enemy_controller_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM actions",
      "SELECT * FROM appearance_features",
      "SELECT * FROM appearance_features_components",
    ]);
  await player.reducers.createAccount({ name: "fighter" });

  await waitFor(() => enemyHp() != null, 30000);
  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("attacking a co-located enemy reduces its hp", async () => {
  const targetId = enemyId()!;
  const before = enemyHp();
  expect(before).toBe(10);

  // The proper backward conversion: resolve the action id from the subscribed
  // actions table by name, never by assuming an enumeration order.
  await waitFor(() => player.db.actions.count() > 0, 30000);
  const attackActionId = [...player.db.actions.iter()].find(
    (row) => row.name === "test_attack",
  )!.id;
  player.reducers.act({ actionId: attackActionId, targetEntityId: targetId });

  await waitFor(() => (enemyHp() ?? 10) < 10, 30000);
  expect(enemyHp()).toBeLessThan(10);
});

test("a stat-less trait-bearing entity gets no HP fabricated", async () => {
  // The inert entity carries only a zero-stat trait. It goes through the stat
  // pipeline — proven by its resolved appearance — but sums to zero mhp/mep,
  // so the pool guard must leave it with no HP component (thus un-attackable).
  await waitFor(() => player.db.appearance_features.count() > 0, 30000);
  const markIndex = [...player.db.appearance_features.iter()].find(
    (row) => row.name === "test_inert_mark",
  )?.index;
  expect(markIndex).toBeDefined();

  const inertRow = () =>
    [...player.db.appearance_features_components.iter()].find((row) =>
      [...row.appearanceFeatureIndexes].includes(markIndex!),
    );
  await waitFor(() => inertRow() != null, 30000);

  const inertId = inertRow()!.entityId;
  const hasHp = [...player.db.hp_components.iter()].some(
    (row) => row.entityId === inertId,
  );
  expect(hasHp).toBe(false);
});
