import { createEntitySerializer, createLogger } from "bitecs-helpers";
import { describe, it, expect } from "bun:test";
import {
  addComponent,
  addEntity,
  createWorld,
  getAllEntities,
  getEntityComponents,
} from "bitecs";
import { createObservationSystem } from "../src/systems/observationSystem";
import { createComponentRecord } from "../src/componentRecord";

const { log } = createLogger({ level: 2 });

const componentRecord = createComponentRecord();

const { deserializeEntity } = createEntitySerializer(
  { addComponent, addEntity, getEntityComponents },
  componentRecord
);

describe("trpg-lib", () => {
  it("can simply add and deserialize entities", () => {
    const world = createWorld();
    const system = createObservationSystem(componentRecord);

    log("deserializeEntity observer");
    deserializeEntity(world, {
      Position: { x: 0, y: 0, z: 0 },
      Observer: { range: 99 },
    });

    system(world, { observations: [] });

    expect(true).toBeTrue();
    console.log(getAllEntities(world));
  });
});
