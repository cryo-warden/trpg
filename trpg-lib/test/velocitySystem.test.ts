import { describe, it, expect } from "bun:test";
import { createWorld } from "bitecs";
import { createEntitySerializerFromComponents } from "./setup/entitySerializer";
import { debugLogger, verboseLogger } from "./setup/log";
import { createVelocitySystem } from "../src/systems/velocitySystem";
import {
  componentSerializer,
  createResourceSystem,
  sleep,
} from "bitecs-helpers";
import { clockSystem, createClock } from "../src/resources/clock";
import { createComponentRecord } from "../src/components";

const componentRecord = createComponentRecord();
const { Position } = componentRecord;
const { deserializeEntity } =
  createEntitySerializerFromComponents(componentRecord);

const { serializeComponent } = componentSerializer;

describe("velocitySystem", () => {
  it("updates an entity's position according to its velocity", async () => {
    const world = createWorld();
    const clock = createClock();
    const system = createResourceSystem([
      { system: clockSystem },
      { system: createVelocitySystem(componentRecord) },
    ])({ clock });

    const initialTime = clock.now;
    const initialPosition = { x: 5, y: 4, z: 3 };
    const velocity = { x: 1, y: 1, z: 0 };

    const entity = deserializeEntity(world, {
      Position: { ...initialPosition },
      Velocity: { ...velocity },
    });

    debugLogger.log("Entities:", entity);

    const iterationCount = 100;
    for (let i = 0; i < iterationCount; ++i) {
      await sleep(1 / 60);
      system(world);
      verboseLogger.log(serializeComponent(Position, entity));
      const expectedX =
        initialPosition.x + velocity.x * (clock.now - initialTime);
      const expectedY =
        initialPosition.y + velocity.y * (clock.now - initialTime);

      expect(Position.x[entity]).toBeCloseTo(expectedX);
      expect(Position.y[entity]).toBeCloseTo(expectedY);
    }
  });
});
