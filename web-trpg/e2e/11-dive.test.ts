import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { divePack } from "./testAssets";

// Phase 11: dive. One action, three consequences: the actor lands in the
// registered prone stance, gains a braced status (bonus defense, folded
// through the status cache into real defense), and — targeting an item —
// grabs it mid-dive, wielding an armament immediately so its stat
// contributions (including morale) flow at once.

let admin: DbConnection;
let player: DbConnection;
let playerEntityId: bigint;

const idByName = (
  table: { iter: () => Iterable<{ id: number; name: string }> },
  name: string,
): number => [...table.iter()].find((row) => row.name === name)!.id;

const myRow = <Row extends { entityId: bigint }>(rows: Iterable<Row>) =>
  [...rows].find((row) => row.entityId === playerEntityId);

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: divePack() });

  player = (await connect()).connection;
  player
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM actions",
      "SELECT * FROM stances",
      "SELECT * FROM active_stance_components",
      "SELECT * FROM equipment_components",
      "SELECT * FROM total_stat_block_components",
      "SELECT * FROM hp_components",
      "SELECT * FROM item_components",
      "SELECT * FROM location_components",
      "SELECT * FROM player_controller_components",
    ]);
  await player.reducers.createAccount({ name: "diver" });

  await waitFor(() => player.db.player_controller_components.count() > 0, 30000);
  playerEntityId = [...player.db.player_controller_components.iter()][0]
    .entityId;
  await waitFor(() => player.db.item_components.count() > 0, 30000);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  player?.disconnect();
});

test("diving at a sword lands prone, braced, holding the sword — morale included", async () => {
  const swordItemId = [...player.db.item_components.iter()][0].entityId;
  const diveId = idByName(player.db.actions, "test_dive");
  await player.reducers.act({
    actionId: diveId,
    targetEntityId: swordItemId,
  });

  const proneId = idByName(player.db.stances, "test_prone");
  await waitFor(
    () => myRow(player.db.active_stance_components.iter())?.stanceId === proneId,
    30000,
  );

  // Grabbed: the sword's location is the player (carrying IS location).
  const swordLocation = [...player.db.location_components.iter()].find(
    (row) => row.entityId === swordItemId,
  );
  expect(swordLocation?.locationEntityId).toBe(playerEntityId);

  // Wielded immediately: equipment lists the armament, and its stats flow —
  // morale 5 (body) + 3 (brave sword), defense 0 + 2 (braced).
  await waitFor(
    () => (myRow(player.db.equipment_components.iter())?.armamentIds.length ?? 0) > 0,
    30000,
  );
  await waitFor(
    () =>
      myRow(player.db.total_stat_block_components.iter())?.statBlock.morale ===
      8,
    30000,
  );
  await waitFor(() => myRow(player.db.hp_components.iter())?.defense === 2, 30000);
}, 60000);
