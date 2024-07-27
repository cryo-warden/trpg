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
import { createComponentRecord } from "../src/componentRecord";
import { direct, getDistance } from "../src/vector";

const componentRecord = createComponentRecord();
const { Position, Velocity } = componentRecord;
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

  it("can move an entity toward a target destination", async () => {
    const world = createWorld();
    const clock = createClock();
    const system = createResourceSystem([
      { system: clockSystem },
      { system: createVelocitySystem(componentRecord) },
    ])({ clock });

    const initialPosition = { x: 5, y: 4, z: 3 };
    const destinationPosition = { x: 80, y: -40, z: 100 };

    const traveler = deserializeEntity(world, {
      Position: { ...initialPosition },
      Velocity: { x: 0, y: 0, z: 0 },
    });

    const destination = deserializeEntity(world, {
      Position: { ...destinationPosition },
    });

    debugLogger.log("Entities:", traveler, destination);

    direct(128, traveler, traveler, destination, Velocity, Position, Position);

    debugLogger.log(
      "Velocity:",
      Velocity.x[traveler],
      Velocity.y[traveler],
      Velocity.z[traveler]
    );

    const iterationCount = 100;
    let distance = getDistance(traveler, destination, Position);
    for (let i = 0; i < iterationCount; ++i) {
      await sleep(1 / 60);
      system(world);
      verboseLogger.log(serializeComponent(Position, traveler));
      const newDistance = getDistance(traveler, destination, Position);

      if (distance < 4) {
        debugLogger.log("Got within range! Stopping test.");
        break;
      }
      expect(newDistance).toBeLessThan(distance);
      distance = newDistance;
    }
  });
});
