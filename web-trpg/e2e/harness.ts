/**
 * Thin wrappers around the `spacetime` CLI for driving a real, isolated test
 * database. The E2E suite publishes the server module fresh to a throwaway
 * database name, seeds it, drives reducers, and asserts via SQL — so it never
 * touches the developer's live `trpg` database.
 */

/** Module path is relative to the web-trpg working directory (po dir). */
const SERVER_MODULE_PATH = "../server";

/** The isolated database the E2E suite publishes to. */
export const TEST_DB = "trpg-e2e";

export const SPACETIME_URI = "ws://localhost:3000";

const spacetime = (args: string[]): { code: number; out: string } => {
  const result = Bun.spawnSync({ cmd: ["spacetime", ...args] });
  const decode = (buffer: Uint8Array | null) =>
    buffer ? new TextDecoder().decode(buffer) : "";
  return {
    code: result.exitCode ?? 1,
    out: `${decode(result.stdout)}${decode(result.stderr)}`,
  };
};

/** Publish the server module fresh (data wiped) to an isolated database. */
export const publishTestModule = (dbName: string = TEST_DB): void => {
  const { code, out } = spacetime([
    "publish",
    "--module-path",
    SERVER_MODULE_PATH,
    dbName,
    "--delete-data",
    "--yes",
  ]);
  if (code !== 0) {
    throw new Error(`spacetime publish failed (exit ${code}):\n${out}`);
  }
};

/** Run a read-only SQL query against a database, returning raw CLI output. */
export const sql = (dbName: string, query: string): string => {
  const { code, out } = spacetime(["sql", dbName, query]);
  if (code !== 0) {
    throw new Error(`spacetime sql failed (exit ${code}):\n${out}`);
  }
  return out;
};

/** The module's log output (for diagnostics). */
export const moduleLogs = (dbName: string = TEST_DB): string =>
  spacetime(["logs", dbName]).out;

/** Best-effort teardown of a test database. */
export const deleteTestModule = (dbName: string = TEST_DB): void => {
  spacetime(["delete", dbName]);
};
