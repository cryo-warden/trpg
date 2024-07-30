import { describe, it } from "bun:test";
import { createSystemOfPipeline } from "../src";
import { createWorld, System } from "bitecs";

const testSystem0: System<[]> = (world) => {
  return world;
};

const testSystem1: System<
  [
    { test1: string; test2: number },
    { test3: string; test4: number; test5: { a: 1; c: 7 } },
    "test string",
    { test6: 18 }
  ]
> = (world, { test1, test2 }, { test3, test4, test5 }) => {
  return world;
};

const testSystem2: System<
  [{ test2: number }, { test5: { a: 1; b: 2 } }, string]
> = (world, { test2 }, { test5 }) => {
  return world;
};

const testSystem3: System<[{ test7: 37 }]> = (world) => {
  return world;
};

describe("createSystemOfPipeline", () => {
  it("can make a pipeline", () => {
    createSystemOfPipeline(testSystem0, testSystem1, testSystem2);
  });
  it("can execute a pipeline", () => {
    const world = createWorld();
    const pipeline = createSystemOfPipeline(
      testSystem0,
      testSystem1,
      testSystem2,
      testSystem3
    );
    pipeline(
      world,
      { test1: "hello", test2: 5, test7: 37 },
      { test3: "", test4: 12, test5: { a: 1, b: 2, c: 7 } },
      "test string",
      { test6: 18 }
    );
  });
});
