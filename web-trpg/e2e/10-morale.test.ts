import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, playerEntityIdFor, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { moralePack } from "./testAssets";

// Phase 10: size + morale. The giant's every attack round intimidates the
// mouse (implicit size delta + authored bonus, resolved EARLY so fear lands
// before blows). Overwhelming the mouse's nerve BREAKS it: forced into the
// registered cowering stance, morale drained. The way back: rally (EP for
// morale), crawl away from the looming pressure, stand back up.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const idByName = (
  table: { iter: () => Iterable<{ id: number; name: string }> },
  name: string,
): number => [...table.iter()].find((row) => row.name === name)!.id;

const myStanceId = (): number | undefined =>
  [...player.db.active_stance_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  )?.stanceId;

const myMorale = (): number | undefined => {
  const total = [...player.db.total_stat_block_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );
  return total?.statBlock.morale;
};

const myFear = () =>
  [...player.db.fear_status_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

const myEp = () =>
  [...player.db.ep_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: moralePack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM stances",
      "SELECT * FROM actions_components",
      "SELECT * FROM active_stance_components",
      "SELECT * FROM total_stat_block_components",
      "SELECT * FROM fear_status_components",
      "SELECT * FROM courage_status_components",
      "SELECT * FROM ep_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
      "SELECT * FROM player_controller_components",
      "SELECT * FROM accounts",
    ]);
  await player.reducers.createAccount({ name: "mouse" });

  playerEntityId = await playerEntityIdFor(player, "mouse");
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

const myAvailableActionIds = (): number[] =>
  [...player.db.actions_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  )?.actionIds ?? [];

const myCourage = () =>
  [...player.db.courage_status_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

test("the giant's attack breaks the mouse: a fear status lands, no forced stance", async () => {
  const standingId = idByName(player.db.stances, "test_standing");
  // The fear records the highest intimidation received (size delta 4 +
  // authored 3 = 7). No stance is forced — the mouse stays standing; fear
  // does its work through morale alone.
  await waitFor(() => myFear() != null, 30000);
  expect(myFear()?.intimidation).toBe(7);
  expect(myStanceId()).toBe(standingId);
}, 60000);

test("feared, the mouse's morale sinks: only rally is reachable, not move", async () => {
  const moveId = idByName(player.db.actions, "test_move");
  const rallyId = idByName(player.db.actions, "test_rally");
  // While the fear holds, base morale 5 minus fear 7 nets negative, under
  // both thresholds: the committed move (morale >= 1) drops out of the
  // derived set, while rally (no morale requirement) remains the way back.
  await waitFor(
    () =>
      myFear() != null &&
      myMorale() !== undefined &&
      myMorale()! < 0 &&
      myAvailableActionIds().includes(rallyId) &&
      !myAvailableActionIds().includes(moveId),
    30000,
  );
  expect(myMorale()!).toBeLessThan(0);
  expect(myAvailableActionIds()).toContain(rallyId);
  expect(myAvailableActionIds()).not.toContain(moveId);
}, 60000);

test("rally stacks a courage surge — folding into morale — at no EP cost", async () => {
  const rallyId = idByName(player.db.actions, "test_rally");
  await waitFor(() => myEp() != null, 30000);
  const epBefore = myEp()!.ep;
  await player.reducers.act({
    actionId: rallyId,
    targetEntityId: playerEntityId,
  });
  // A courage status appears (its value both the +morale and the remaining
  // duration), and rally spends no EP — its cost is the round it took.
  await waitFor(() => myCourage() != null, 30000);
  expect(myCourage()!.morale).toBeGreaterThan(0);
  expect(myEp()!.ep).toBe(epBefore);
}, 60000);
