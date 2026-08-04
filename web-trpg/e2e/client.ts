import type { Identity } from "spacetimedb";
import { DbConnection } from "../src/stdb";
import { SPACETIME_URI, TEST_DB } from "./harness";

export type Connected = { connection: DbConnection; identity: Identity };

/** Open an SDK connection to the running test instance. An empty token yields
 * a fresh identity; pass a saved token to reconnect as the same identity. */
export const connect = (token = ""): Promise<Connected> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("timed out connecting to SpacetimeDB")),
      20000,
    );
    DbConnection.builder()
      .withDatabaseName(TEST_DB)
      .withUri(SPACETIME_URI)
      .withToken(token)
      .onConnect((connection, identity) => {
        clearTimeout(timer);
        resolve({ connection, identity });
      })
      .onConnectError((error) => {
        clearTimeout(timer);
        reject(error);
      })
      .build();
  });

/** Poll until a predicate holds or the timeout elapses. */
export const waitFor = async (
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
