/**
 * Thin wrappers around the `spacetime` CLI for driving a real, isolated test
 * database. The E2E suite publishes the server module fresh to a throwaway
 * database name, seeds it, drives reducers, and asserts via SQL — so it never
 * touches the developer's live `trpg` database.
 */

/** Module path is relative to the web-trpg working directory (po dir). */
const SERVER_MODULE_PATH = "../server";

/** The isolated database the full-tick E2E suite publishes to. */
export const TEST_DB = "trpg-e2e";

/** A SEPARATE isolated database for the feature-gated test-reducer module: the
 * same production code plus one reducer per test set (server/src/test_reducers.rs),
 * compiled with the `testing` feature. Distinct name so it never collides with
 * the full-tick e2e DB or production. */
export const TEST_REDUCER_DB = "trpg-e2e-test";

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

/** Build the module with the `testing` feature and publish it (as a prebuilt
 * wasm — `spacetime build` can't forward cargo features) to an ISOLATED test
 * database. This is the test-reducer entrypoint: the same production code plus
 * one reducer per test set, each running the real systems against the real DB. */
export const publishTestReducerModule = (
  dbName: string = TEST_REDUCER_DB,
): void => {
  const build = Bun.spawnSync({
    cmd: [
      "cargo",
      "build",
      "--manifest-path",
      "../server/Cargo.toml",
      "--features",
      "testing",
      "--target",
      "wasm32-unknown-unknown",
      "--release",
    ],
  });
  if ((build.exitCode ?? 1) !== 0) {
    const out =
      new TextDecoder().decode(build.stdout) +
      new TextDecoder().decode(build.stderr);
    throw new Error(`cargo build --features testing failed:\n${out}`);
  }
  const { code, out } = spacetime([
    "publish",
    "--bin-path",
    "../target/wasm32-unknown-unknown/release/server.wasm",
    dbName,
    "--delete-data",
    "--yes",
  ]);
  if (code !== 0) {
    throw new Error(`test-reducer module publish failed (exit ${code}):\n${out}`);
  }
};

/** Call a reducer by name. A test-set reducer returns Ok (exit 0 = pass) or Err
 * (non-zero = fail, message in output). */
export const callReducer = (
  dbName: string,
  reducer: string,
  ...args: string[]
): { code: number; out: string } => spacetime(["call", dbName, reducer, ...args]);

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
