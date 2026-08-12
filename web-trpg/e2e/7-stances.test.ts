import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { stancePack } from "./testAssets";

// Phase 7: stances. The player's available actions are DERIVED: the total
// stat block (baseline + stance) grants actions, and each action's stat
// requirements filter that grant. Swapping stances re-derives the set
// through the ordinary dirty-flag path, and adopting a stance whose own
// requirements the body cannot meet is rejected server-side.

let admin: DbConnection;
let player: DbConnection;

const stanceIdByName = (name: string): number =>
  [...player.db.stances.iter()].find((row) => row.name === name)!.id;

const actionIdByName = (name: string): number =>
  [...player.db.actions.iter()].find((row) => row.name === name)!.id;

const myActionIds = (): number[] => {
  const row = [...player.db.actions_components.iter()][0];
  return row == null ? [] : [...row.actionIds];
};

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: stancePack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM stances",
      "SELECT * FROM actions_components",
      "SELECT * FROM active_stance_components",
      "SELECT * FROM player_controller_components",
    ]);
  await player.reducers.createAccount({ name: "stancer" });

  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  await waitFor(() => player.db.stances.count() === 3n, 30000);
  // The stats system has run once the derived actions arrive.
  await waitFor(() => myActionIds().length > 0, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("the derived actions come from the baseline grant, requirement-filtered", () => {
  expect(new Set(myActionIds())).toEqual(
    new Set([actionIdByName("test_punch"), actionIdByName("test_shuffle")]),
  );
});

test("the new player carries the authored stance", () => {
  const active = [...player.db.active_stance_components.iter()][0];
  expect(active?.stanceId).toBe(stanceIdByName("test_brawler"));
});

test("swapping to a gait-starved stance drops the movement action", async () => {
  await player.reducers.setStance({ stanceId: stanceIdByName("test_prone") });
  await waitFor(
    () => !myActionIds().includes(actionIdByName("test_shuffle")),
    30000,
  );
  expect(myActionIds()).toEqual([actionIdByName("test_punch")]);
});

test("swapping back restores the movement action", async () => {
  await player.reducers.setStance({
    stanceId: stanceIdByName("test_brawler"),
  });
  await waitFor(
    () => myActionIds().includes(actionIdByName("test_shuffle")),
    30000,
  );
  expect(new Set(myActionIds())).toEqual(
    new Set([actionIdByName("test_punch"), actionIdByName("test_shuffle")]),
  );
});

test("a stance whose requirements the body cannot meet is rejected", async () => {
  await expect(
    player.reducers.setStance({
      stanceId: stanceIdByName("test_four_arms"),
    }),
  ).rejects.toThrow(/requirements/);
});
