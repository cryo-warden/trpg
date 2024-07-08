import { describe, it } from "bun:test";
import { createPipeline } from "../src";
import { createWorld, System } from "bitecs";

const testSystem0: System<[]> = (world) => {
  return world;
};

const testSystem1: System<[{ test1: string; test2: number }]> = (
  world,
  { test1 }
) => {
  return world;
};

const testSystem2: System<[{ test2: number }]> = (world, { test2 }) => {
  return world;
};

describe("createPipeline", () => {
  it("can make a pipeline", () => {
    createPipeline(testSystem0, testSystem1, testSystem2);
  });
  it("can execute a pipeline", () => {
    const world = createWorld();
    const pipeline = createPipeline(testSystem0, testSystem1, testSystem2);
    pipeline(world, { test1: "hello", test2: 5 });
  });
});
