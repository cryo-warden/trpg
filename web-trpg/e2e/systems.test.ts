import { test, expect, beforeAll } from "bun:test";
import { requirePrereqs } from "./prereqs";
import {
  publishTestReducerModule,
  callReducer,
  TEST_REDUCER_DB,
} from "./harness";

// Unit-style SYSTEM tests. Each reducer in server/src/test_reducers.rs is one
// test SET: it seeds a minimal fixture and runs ONLY the systems it names
// against the real database, then returns Ok (pass) or Err (fail). Because a
// set names exactly the systems it exercises, adding a new global system can't
// break it. Full-tick cross-system behavior is covered by the other e2e files
// (the single integration surface).
//
// Add a test set: write `#[reducer] pub fn test_<name>` in test_reducers.rs and
// add its name to SYSTEM_TEST_SETS below.
const SYSTEM_TEST_SETS = ["test_party_leader_sanitation"];

beforeAll(() => {
  requirePrereqs();
  publishTestReducerModule();
}, 180000);

for (const reducer of SYSTEM_TEST_SETS) {
  test(reducer, () => {
    const { code, out } = callReducer(TEST_REDUCER_DB, reducer);
    // A failed test set returns Err; surface its message as the failure.
    if (code !== 0) {
      throw new Error(`${reducer} failed:\n${out}`);
    }
    expect(code).toBe(0);
  });
}
