import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
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

const myMorale = () =>
  [...player.db.morale_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

const myEp = () =>
  [...player.db.ep_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  );

const myLocation = (): bigint | undefined =>
  [...player.db.location_components.iter()].find(
    (row) => row.entityId === playerEntityId,
  )?.locationEntityId;

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
      "SELECT * FROM morale_components",
      "SELECT * FROM ep_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM location_components",
      "SELECT * FROM path_components",
      "SELECT * FROM player_controller_components",
    ]);
  await player.reducers.createAccount({ name: "mouse" });

  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  playerEntityId = [...player.db.player_controller_components.iter()][0]
    .entityId;
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("the giant's attack breaks the mouse into cowering and drains morale", async () => {
  const coweringId = idByName(player.db.stances, "test_cowering");
  await waitFor(() => myStanceId() === coweringId, 30000);
  expect(myStanceId()).toBe(coweringId);
  await waitFor(() => myMorale()?.morale === 0, 30000);
  expect(myMorale()?.morale).toBe(0);
}, 60000);

test("standing up under the giant's looming pressure is refused", async () => {
  await expect(
    player.reducers.setStance({
      stanceId: idByName(player.db.stances, "test_standing"),
    }),
  ).rejects.toThrow(/Too shaken/);
}, 60000);

test("rally spends effort to recover nerve", async () => {
  const rallyId = idByName(player.db.actions, "test_rally");
  const epBefore = myEp()!.ep;
  await player.reducers.act({
    actionId: rallyId,
    targetEntityId: playerEntityId,
  });
  await waitFor(() => (myMorale()?.morale ?? 0) >= 2, 30000);
  expect(myMorale()?.morale).toBe(2);
  expect(myEp()!.ep).toBe(epBefore - 1);
}, 60000);

test("crawling away from the pressure lets the mouse stand back up", async () => {
  const moveId = idByName(player.db.actions, "test_move");
  const pathEntityId = [...player.db.path_components.iter()][0].entityId;
  await player.reducers.act({
    actionId: moveId,
    targetEntityId: pathEntityId,
  });
  await waitFor(() => myLocation() === 1000n, 30000);

  const standingId = idByName(player.db.stances, "test_standing");
  await player.reducers.setStance({ stanceId: standingId });
  await waitFor(() => myStanceId() === standingId, 30000);
  expect(myStanceId()).toBe(standingId);
}, 60000);
