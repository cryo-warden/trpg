import { describe, it, expect } from "bun:test";
import { createWorld } from "bitecs";
import { createLogger } from "bitecs-helpers";
import { createObservationSystem } from "../src/systems/observationSystem";
import { createEntitySerializerFromComponents } from "./setup/entitySerializer";
import { debugLogger, verboseLogger } from "./setup/log";
import { createComponentRecord } from "../src/components";

const componentRecord = createComponentRecord();

const { deserializeEntity } =
  createEntitySerializerFromComponents(componentRecord);

describe("observationSystem", () => {
  it("generates Observations when Observables are in range of an Observer", () => {
    const observationLogger = createLogger({
      prefix: "Observation",
      // onLog: log,
    });

    const world = createWorld();
    const system = createObservationSystem(componentRecord)({
      observationHandler: observationLogger.log,
    });

    const observer = deserializeEntity(world, {
      Position: { x: 5, y: 4, z: 3 },
      Observer: { range: 30 },
    });
    const inRangeObservables = [
      deserializeEntity(world, {
        Position: { x: 5, y: 2, z: 25 },
        Observable: { range: 5, appearance: 12 },
      }),
      deserializeEntity(world, {
        Position: { x: -15, y: 24, z: 25 },
        Observable: { range: 5, appearance: 88 },
      }),
      deserializeEntity(world, {
        Position: { x: -17, y: -8, z: 30 },
        Observable: { range: 5, appearance: 55 },
      }),
      deserializeEntity(world, {
        Position: { x: 8, y: 11, z: 31 },
        Observable: { range: 5, appearance: 9 },
      }),
      deserializeEntity(world, {
        Position: { x: 19, y: -8, z: -4 },
        Observable: { range: 5, appearance: 77 },
      }),
    ];
    const outOfRangeObservables = [
      deserializeEntity(world, {
        Position: { x: 45, y: 41, z: 25 },
        Observable: { range: 5, appearance: 12 },
      }),
      deserializeEntity(world, {
        Position: { x: -35, y: 44, z: 25 },
        Observable: { range: 5, appearance: 88 },
      }),
      deserializeEntity(world, {
        Position: { x: -17, y: -38, z: 30 },
        Observable: { range: 5, appearance: 55 },
      }),
      deserializeEntity(world, {
        Position: { x: 8, y: 11, z: 41 },
        Observable: { range: 5, appearance: 9 },
      }),
      deserializeEntity(world, {
        Position: { x: 199, y: -288, z: -344 },
        Observable: { range: 5, appearance: 77 },
      }),
    ];

    debugLogger.log(
      "Entities:",
      observer,
      inRangeObservables,
      outOfRangeObservables
    );

    const iterationCount = 5;
    for (let i = 0; i < iterationCount; ++i) {
      system(world);
    }

    verboseLogger.log("Observation Log:", observationLogger.logs);

    expect(observationLogger.logs.length).toBe(
      inRangeObservables.length * iterationCount
    );
  });
});
