import { describe, it, expect } from "bun:test";
import { world } from "../src";

describe("world", () => {
  it("exists", () => {
    expect(world).toBeDefined();
  });
});
