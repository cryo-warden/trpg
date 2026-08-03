import { test, expect, beforeAll, afterAll } from "bun:test";
import { DbConnection } from "../src/stdb";
import { init } from "../src/Game/init";
import { requirePrereqs } from "./prereqs";
import { publishTestModule, TEST_DB, SPACETIME_URI } from "./harness";

// Phase 1: seed a real instance and confirm the asset catalog lands. Small in
// scope — no world, no ticks — just the connect + push_assets round trip.

let connection: DbConnection;

const connect = (): Promise<DbConnection> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("timed out connecting to SpacetimeDB")),
      20000,
    );
    DbConnection.builder()
      .withDatabaseName(TEST_DB)
      .withUri(SPACETIME_URI)
      .withToken("")
      .onConnect((conn) => {
        clearTimeout(timer);
        conn.subscriptionBuilder().subscribe(["SELECT * FROM actions"]);
        resolve(conn);
      })
      .onConnectError((error) => {
        clearTimeout(timer);
        reject(error);
      })
      .build();
  });

const waitFor = async (
  predicate: () => boolean,
  timeoutMs = 20000,
): Promise<void> => {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("timed out waiting for a condition");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
};

beforeAll(async () => {
  requirePrereqs();
  publishTestModule(TEST_DB);
  connection = await connect();
});

afterAll(() => {
  connection?.disconnect();
});

test("pushing assets populates the action catalog", async () => {
  init(connection);
  await waitFor(() => connection.db.actions.count() > 0);
  expect(connection.db.actions.count()).toBeGreaterThan(0);
});
