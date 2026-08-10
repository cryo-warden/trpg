import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { minimalPack } from "./testAssets";

// Phase 6: the accounts layer and the confirmed multi-device login protocol.
// Device A creates the account; device B may only join once A accepts its
// visible login request; a refusal kills a request outright; unattached
// connections own nothing. (The 30-second post-quorum delay branch needs a
// silent third voter and a real clock, so it is not exercised here.)

let deviceA: DbConnection;
let deviceB: DbConnection;
let deviceC: DbConnection;

const subscribeAccounts = (connection: DbConnection) =>
  connection
    .subscriptionBuilder()
    .subscribe([
      "SELECT * FROM accounts",
      "SELECT * FROM account_identities",
      "SELECT * FROM login_requests",
      "SELECT * FROM login_responses",
    ]);

beforeAll(async () => {
  requirePrereqs();
  publishTestModule();

  deviceA = (await connect()).connection;
  subscribeAccounts(deviceA);
  await deviceA.reducers.pushAssets({ assetPack: minimalPack() });
  await deviceA.reducers.createAccount({ name: "multi" });
  await waitFor(() => deviceA.db.account_identities.count() === 1n, 30000);

  deviceB = (await connect()).connection;
  subscribeAccounts(deviceB);
  deviceC = (await connect()).connection;
  subscribeAccounts(deviceC);
}, 60000);

afterAll(() => {
  deviceA?.disconnect();
  deviceB?.disconnect();
  deviceC?.disconnect();
});

test("an account name cannot be taken twice", async () => {
  await expect(
    deviceB.reducers.createAccount({ name: "multi" }),
  ).rejects.toThrow();
});

test("a second device attaches only after an existing device accepts", async () => {
  await deviceB.reducers.requestLogin({ accountName: "multi" });
  await waitFor(() => deviceA.db.login_requests.count() === 1n, 30000);
  const request = [...deviceA.db.login_requests.iter()][0];
  expect(request.status.tag).toBe("Pending");
  expect(deviceB.db.account_identities.count()).toBe(1n);

  // The single previous connection accepts: quorum AND all-responded, so the
  // attachment is immediate.
  await deviceA.reducers.respondLogin({
    loginRequestId: request.id,
    accept: true,
  });
  await waitFor(() => deviceB.db.account_identities.count() === 2n, 30000);
  await waitFor(
    () =>
      [...deviceB.db.login_requests.iter()][0]?.status.tag === "Accepted",
    30000,
  );
});

test("any explicit refusal fails a login request", async () => {
  await deviceC.reducers.requestLogin({ accountName: "multi" });
  await waitFor(() => deviceA.db.login_requests.count() === 2n, 30000);
  const request = [...deviceA.db.login_requests.iter()].find(
    (row) => row.status.tag === "Pending",
  )!;

  // Two previous connections now hold the account; one refusal ends it even
  // though the other never responded.
  await deviceB.reducers.respondLogin({
    loginRequestId: request.id,
    accept: false,
  });
  await waitFor(
    () =>
      [...deviceA.db.login_requests.iter()].find((row) => row.id === request.id)
        ?.status.tag === "Refused",
    30000,
  );
  expect(deviceA.db.account_identities.count()).toBe(2n);

  // Late responses to a resolved request fail fast.
  await expect(
    deviceA.reducers.respondLogin({ loginRequestId: request.id, accept: true }),
  ).rejects.toThrow(/already resolved/);
});

test("the requesting connection has no vote and outsiders cannot respond", async () => {
  await deviceC.reducers.requestLogin({ accountName: "multi" });
  await waitFor(() => deviceA.db.login_requests.count() === 3n, 30000);
  const request = [...deviceA.db.login_requests.iter()].find(
    (row) => row.status.tag === "Pending",
  )!;

  await expect(
    deviceC.reducers.respondLogin({ loginRequestId: request.id, accept: true }),
  ).rejects.toThrow(/previously attached/);
});

test("an unattached connection owns nothing and cannot act", async () => {
  await expect(
    deviceC.reducers.act({ actionId: 0, targetEntityId: 1n }),
  ).rejects.toThrow(/Cannot find a player entity/);
});
