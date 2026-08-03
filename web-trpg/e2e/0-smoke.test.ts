import { test, expect, beforeAll } from "bun:test";
import { requirePrereqs } from "./prereqs";
import { publishTestModule, sql, TEST_DB } from "./harness";

// Phase 0: the cheapest E2E check. Verify prerequisites, publish the module
// fresh to an isolated database, and confirm its public tables are queryable.
// No assets, no world. If this fails, later (heavier) phases are skipped via
// --bail.
beforeAll(() => {
  requirePrereqs();
  publishTestModule(TEST_DB);
});

test("prerequisites are present", () => {
  expect(requirePrereqs().every((r) => r.ok)).toBe(true);
});

test("a freshly published module exposes its (empty) public tables", () => {
  // A successful query against a public table proves the module is live; with
  // no assets pushed yet there are no action rows.
  const out = sql(TEST_DB, "SELECT id FROM actions");
  expect(typeof out).toBe("string");
});
