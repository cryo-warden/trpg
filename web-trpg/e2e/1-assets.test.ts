import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { TEST_ADMIN_TOKEN } from "./admin";
import { minimalPack } from "./testAssets";

// Phase 1: the admin claim + asset pipeline against a real instance: pushes
// are admin-gated, the publish-time token is a provisional password that dies
// on rotation, and pushes are strict incremental updates.

let connection: DbConnection;

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();
  connection = (await connect()).connection;
  connection.subscriptionBuilder().subscribe(["SELECT * FROM actions"]);
}, 60000);

afterAll(() => {
  connection?.disconnect();
});

test("pushing is admin-gated and the bootstrap token dies on rotation", async () => {
  // Unattached connections cannot push.
  await expect(
    connection.reducers.pushAssets({ assetPack: minimalPack() }),
  ).rejects.toThrow(/not attached/);

  // The publish action bootstraps the admin account exactly once.
  await connection.reducers.bootstrapAdmin({ adminToken: TEST_ADMIN_TOKEN });
  await expect(
    connection.reducers.bootstrapAdmin({ adminToken: "other" }),
  ).rejects.toThrow(/already exists/);

  // A wrong token cannot claim the account.
  await expect(
    connection.reducers.loginWithPassword({
      accountName: "admin",
      password: "wrong",
    }),
  ).rejects.toThrow(/does not match/);
  await connection.reducers.loginWithPassword({
    accountName: "admin",
    password: TEST_ADMIN_TOKEN,
  });

  // Claimed but not rotated: still no privileged actions.
  await expect(
    connection.reducers.pushAssets({ assetPack: minimalPack() }),
  ).rejects.toThrow(/rotated/);

  // Rotation destroys the provisional credential and unlocks the account.
  await connection.reducers.setPassword({ newPassword: "fresh-secret" });
  await connection.reducers.pushAssets({ assetPack: minimalPack() });
  await waitFor(() => connection.db.actions.count() > 0);
  expect(connection.db.actions.count()).toBeGreaterThan(0);

  // The old token is gone: it can no longer claim anything, and the account
  // is held, so password login is closed entirely.
  await expect(
    connection.reducers.loginWithPassword({
      accountName: "admin",
      password: TEST_ADMIN_TOKEN,
    }),
  ).rejects.toThrow();
});

test("re-pushing matches by name: ids kept, bodies updated, new assets added", async () => {
  // An identical re-push is a valid no-op update.
  await connection.reducers.pushAssets({ assetPack: minimalPack() });

  // A modified re-push: a new action listed FIRST (so any enumeration-based
  // id assignment would misnumber it) plus a body change to the existing one.
  const pack = {
    ...minimalPack(),
    actions: [
      {
        name: "another_action",
        value: { actionType: { tag: "Move" } as const, rounds: [] },
      },
      {
        name: "test_action",
        value: { actionType: { tag: "Buff" } as const, rounds: [] },
      },
    ],
  };
  await connection.reducers.pushAssets({ assetPack: pack });
  await waitFor(() => connection.db.actions.count() === 2n);

  const rows = [...connection.db.actions.iter()];
  const existing = rows.find((row) => row.name === "test_action");
  const added = rows.find((row) => row.name === "another_action");
  expect(existing?.id).toBe(0); // kept its id despite the reordering
  expect(existing?.actionType.tag).toBe("Buff"); // body updated
  expect(added?.id).toBe(1); // fresh id, never a reindex
});

test("a push omitting an existing asset fails fast and changes nothing", async () => {
  const pack = {
    ...minimalPack(),
    actions: [
      {
        name: "another_action",
        value: { actionType: { tag: "Move" } as const, rounds: [] },
      },
    ],
  };
  await expect(
    connection.reducers.pushAssets({ assetPack: pack }),
  ).rejects.toThrow(/missing from the pushed assets/);
  expect(connection.db.actions.count()).toBe(2n);
});
