import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { requirements } from "../src/Game/assets/stat_requirements";
import { stancePack } from "./testAssets";

// Phase 7: stances. The player's available actions are DERIVED: the total
// stat block (baseline + stance) grants actions, and each action's stat
// requirements filter that grant. Swapping stances re-derives the set
// through the ordinary dirty-flag path, and adopting a stance whose own
// requirements the body cannot meet is rejected server-side.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const stanceIdByName = (name: string): number =>
  [...player.db.stances.iter()].find((row) => row.name === name)!.id;

const actionIdByName = (name: string): number =>
  [...player.db.actions.iter()].find((row) => row.name === name)!.id;

const myActionIds = (): number[] => {
  const row = [...player.db.actions_components.iter()].find(
    (r) => r.entityId === playerEntityId,
  );
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
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "stancer" });

  playerEntityId = await playerEntityIdFor(player, "stancer");
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
    new Set([
      actionIdByName("test_punch"),
      actionIdByName("test_shuffle"),
      actionIdByName("test_lie"),
      actionIdByName("test_square"),
      actionIdByName("test_reach_wide"),
    ]),
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
  expect(new Set(myActionIds())).toEqual(
    new Set([
      actionIdByName("test_punch"),
      actionIdByName("test_lie"),
      actionIdByName("test_square"),
      actionIdByName("test_reach_wide"),
    ]),
  );
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
    new Set([
      actionIdByName("test_punch"),
      actionIdByName("test_shuffle"),
      actionIdByName("test_lie"),
      actionIdByName("test_square"),
      actionIdByName("test_reach_wide"),
    ]),
  );
});

test("a posture ACTION spends a round to change stance", async () => {
  // Back to brawler first (previous test left us there), then lie down via
  // the round-costing action rather than the reducer.
  const lieId = actionIdByName("test_lie");
  await player.reducers.act({
    actionId: lieId,
    targetEntityId: playerEntityId,
  });
  const proneId = stanceIdByName("test_prone");
  await waitFor(
    () =>
      [...player.db.active_stance_components.iter()].find(
        (row) => row.entityId === playerEntityId,
      )?.stanceId === proneId,
    30000,
  );
  // The stance's grants re-derive exactly as with the reducer path.
  await waitFor(
    () => !myActionIds().includes(actionIdByName("test_shuffle")),
    30000,
  );
  await player.reducers.setStance({ stanceId: stanceIdByName("test_brawler") });
  await waitFor(
    () => myActionIds().includes(actionIdByName("test_shuffle")),
    30000,
  );
}, 60000);

test("a stance whose requirements the body cannot meet is rejected", async () => {
  await expect(
    player.reducers.setStance({
      stanceId: stanceIdByName("test_four_arms"),
    }),
  ).rejects.toThrow(/requirements/);
});

test("an asset re-push re-derives EXISTING entities under the new truth", async () => {
  // The punch's requirements harden beyond any body. Without the push
  // dirtying every entity, this player's derived set — computed under the
  // OLD requirements — would keep the stale punch forever.
  const base = stancePack();
  const pack = {
    ...base,
    actions: base.actions.map((a) =>
      a.name === "test_punch"
        ? { ...a, value: { ...a.value, requirements: requirements({ hand: 99 }) } }
        : a,
    ),
  };
  await admin.reducers.pushAssets({ assetPack: pack });
  await waitFor(
    () => !myActionIds().includes(actionIdByName("test_punch")),
    30000,
  );
});
