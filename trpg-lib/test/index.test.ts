import { createEntitySerializer, createLogger } from "bitecs-helpers";
import { describe, it, expect } from "bun:test";
import {
  addComponent,
  addEntity,
  createWorld,
  getEntityComponents,
} from "bitecs";
import { observationSystem } from "../src/systems/observationSystem";
import { Position } from "../src/components/Position";
import { Observer } from "../src/components/Observer";
import { Observable } from "../src/components/Observable";

const { log } = createLogger();

const observationLogger = createLogger({ onLog: log });

const observationHandler = observationLogger.log;

const { deserializeEntity } = createEntitySerializer(
  { addComponent, addEntity, getEntityComponents },
  {
    Position,
    Observer,
    Observable,
  }
);

describe("trpg-lib", () => {
  it("can simply add and deserialize entities", () => {
    const world = createWorld();
    const system = observationSystem({ observationHandler });

    log("deserializeEntity observer");
    deserializeEntity(world, {
      Position: { x: 0, y: 0, z: 0 },
      Observer: { range: 99 },
    });

    system(world);

    expect(true).toBeTrue();
  });
});
