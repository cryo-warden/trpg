import { test, expect, beforeAll, afterAll } from "bun:test";
import type { DbConnection } from "../src/stdb";
import { requirePrereqs } from "./prereqs";
import { publishTestModule } from "./harness";
import { connect, waitFor } from "./client";
import { claimAdmin } from "./admin";
import { minimalPack } from "./testAssets";

// Phase 6: the accounts layer and the confirmed multi-device login protocol.
// Device A creates the account; device B may only join once A accepts its
// visible login request with the matching verification code; a refusal kills
// a request outright; unattached connections own nothing. (The 30-second
// post-quorum delay branch needs a silent third voter and a real clock, so it
// is not exercised here.)

let admin: DbConnection;
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

  admin = (await connect()).connection;
  await claimAdmin(admin);
  await admin.reducers.pushAssets({ assetPack: minimalPack() });

  deviceA = (await connect()).connection;
  subscribeAccounts(deviceA);
  await deviceA.reducers.createAccount({ name: "multi" });
  // Two attachments exist now: the admin's and device A's.
  await waitFor(() => deviceA.db.account_identities.count() === 2n, 30000);

  deviceB = (await connect()).connection;
  subscribeAccounts(deviceB);
  deviceC = (await connect()).connection;
  subscribeAccounts(deviceC);
}, 60000);

afterAll(() => {
  admin?.disconnect();
  deviceA?.disconnect();
  deviceB?.disconnect();
  deviceC?.disconnect();
});

test("an account name cannot be taken twice", async () => {
  await expect(
    deviceB.reducers.createAccount({ name: "multi" }),
  ).rejects.toThrow();
});

test("a second device attaches only after a code-verified acceptance", async () => {
  await deviceB.reducers.requestLogin({
    accountName: "multi",
    verificationCode: "271828",
  });
  await waitFor(() => deviceA.db.login_requests.count() === 1n, 30000);
  const request = [...deviceA.db.login_requests.iter()][0];
  expect(request.status.tag).toBe("Pending");
  expect(deviceB.db.account_identities.count()).toBe(2n);

  // A mismatched code means the approval does not count: the request stays
  // pending and no response is recorded.
  await expect(
    deviceA.reducers.acceptLoginRequest({
      loginRequestId: request.id,
      verificationCode: "000000",
    }),
  ).rejects.toThrow(/verification code/);
  expect(
    [...deviceA.db.login_requests.iter()][0]?.status.tag,
  ).toBe("Pending");
  expect(deviceA.db.login_responses.count()).toBe(0n);

  // With the matching code from the requesting device's screen, the single
  // previous connection accepts: quorum AND all-responded, so the attachment
  // is immediate.
  await deviceA.reducers.acceptLoginRequest({
    loginRequestId: request.id,
    verificationCode: "271828",
  });
  await waitFor(() => deviceB.db.account_identities.count() === 3n, 30000);
  await waitFor(
    () =>
      [...deviceB.db.login_requests.iter()][0]?.status.tag === "Accepted",
    30000,
  );
});

test("any explicit refusal fails a login request, no code needed", async () => {
  await deviceC.reducers.requestLogin({
    accountName: "multi",
    verificationCode: "314159",
  });
  await waitFor(() => deviceA.db.login_requests.count() === 2n, 30000);
  const request = [...deviceA.db.login_requests.iter()].find(
    (row) => row.status.tag === "Pending",
  )!;

  // Two previous connections now hold the account; one refusal ends it even
  // though the other never responded.
  await deviceB.reducers.refuseLoginRequest({ loginRequestId: request.id });
  await waitFor(
    () =>
      [...deviceA.db.login_requests.iter()].find((row) => row.id === request.id)
        ?.status.tag === "Refused",
    30000,
  );
  expect(deviceA.db.account_identities.count()).toBe(3n);

  // Late responses to a resolved request fail fast.
  await expect(
    deviceA.reducers.acceptLoginRequest({
      loginRequestId: request.id,
      verificationCode: "314159",
    }),
  ).rejects.toThrow(/already resolved/);
});

test("the requesting connection has no vote and outsiders cannot respond", async () => {
  await deviceC.reducers.requestLogin({
    accountName: "multi",
    verificationCode: "161803",
  });
  await waitFor(() => deviceA.db.login_requests.count() === 3n, 30000);
  const request = [...deviceA.db.login_requests.iter()].find(
    (row) => row.status.tag === "Pending",
  )!;

  await expect(
    deviceC.reducers.acceptLoginRequest({
      loginRequestId: request.id,
      verificationCode: "161803",
    }),
  ).rejects.toThrow(/previously attached/);
});

test("an unattached connection owns nothing and cannot act", async () => {
  await expect(
    deviceC.reducers.act({ actionId: 0, targetEntityId: 1n }),
  ).rejects.toThrow(/Cannot find a player entity/);
});

test("admins provision claimable accounts; a fresh device claims by password", async () => {
  // Provisioning and role granting are admin-gated.
  await expect(
    deviceA.reducers.provisionAccount({
      name: "nope",
      password: "x",
      requireRotation: false,
    }),
  ).rejects.toThrow(/admin role/);

  await admin.reducers.provisionAccount({
    name: "provisioned",
    password: "hunter2",
    requireRotation: false,
  });
  await admin.reducers.grantRole({
    accountName: "provisioned",
    roleName: "admin",
  });

  // No identity holds the provisioned account, so password login claims it —
  // with the right password only.
  await expect(
    deviceC.reducers.loginWithPassword({
      accountName: "provisioned",
      password: "wrong",
    }),
  ).rejects.toThrow(/does not match/);
  await deviceC.reducers.loginWithPassword({
    accountName: "provisioned",
    password: "hunter2",
  });
  await waitFor(() => deviceC.db.account_identities.count() === 4n, 30000);

  // With the granted role and no rotation pending, the claimed account holds
  // real admin power.
  await deviceC.reducers.pushAssets({ assetPack: minimalPack() });
});
