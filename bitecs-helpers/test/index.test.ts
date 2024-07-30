import { describe, it, expect } from "bun:test";
import {
  addComponent,
  addEntity,
  createWorld,
  defineQuery,
  getEntityComponents,
  removeEntity,
  System,
} from "bitecs";

import {
  componentSerializer,
  createEntitySerializer,
  type EntityId,
  createLogger,
  createSystemOf2QueriesDistinct,
  createSystemOfQuery,
  createSystemOfPipeline,
} from "../src";

import { createSystemRecord } from "./systemRecord";

import { createComponentRecord } from "./componentRecord";

const componentRecord = createComponentRecord();
const { Position } = componentRecord;

const { playerObserverSystem, randomFlySystem } =
  createSystemRecord(componentRecord);

const {
  logs,
  reset: resetLogger,
  log,
} = createLogger({
  onLog: console.log,
});

const testSystem: System<[{ text: string }]> = (world, resource) => {
  log(resource);
  return world;
};

const basicSystem: System = (world) => {
  log("basic");
  return world;
};

const manualSystem: System<[{ x: number; y: number }]> = (world, resource) => {
  log(resource);
  return world;
};

const noopAction = () => {};

const noopSystem = createSystemOfQuery(defineQuery([]), noopAction);

const noopCrossSystem = createSystemOf2QueriesDistinct(
  [defineQuery([]), defineQuery([])],
  noopAction
);

const complicatedCompositeSystem = createSystemOfPipeline(
  noopSystem,
  noopCrossSystem,
  testSystem,
  (world, _: { a: 1; b: 2; c: 3 }) => world
);

const observationLogger = createLogger({ onLog: log });

const { serializeComponent, deserializeComponent } = componentSerializer;
const { serializeEntity, deserializeEntity } = createEntitySerializer(
  { addComponent, addEntity, getEntityComponents },
  componentRecord
);

const stepSystem = createSystemOfPipeline(
  randomFlySystem,
  playerObserverSystem,
  testSystem,
  basicSystem,
  complicatedCompositeSystem,
  manualSystem
);

const resource = {
  log: observationLogger.log,
  text: "testing testing",
  a: 1,
  b: 2,
  c: 3,
  x: 95.5,
  y: 0,
} as const;

const origin = { x: 0, y: 0, z: 0 };

describe("deserializeEntity", () => {
  it("creates the expected entities with the expected component values", () => {
    resetLogger();
    const world = createWorld();
    const playerId = deserializeEntity(world, {
      Player: {},
      Position: origin,
      ActivityQueue: {
        activities: [1, 2, 3, 4],
      },
    });
    deserializeEntity(world, {
      Position: origin,
      RandomFlier: { topSpeed: 0 },
    });
    deserializeEntity(world, {
      Position: origin,
      RandomFlier: { topSpeed: 10 },
    });
    deserializeEntity(world, {
      Position: origin,
      RandomFlier: { topSpeed: 20 },
    });
    stepSystem(world, resource);

    const player = serializeEntity(world, playerId);
    log(player);
    log(logs.length);
    expect(player).toBeDefined();
  });

  it("should update a world repeatedly", () => {
    resetLogger();
    const world = createWorld();
    const playerId = deserializeEntity(world, {
      Player: {},
      Position: origin,
    });
    let entitiesQueue: EntityId[] = [];
    for (let i = 0; i < 100; i++) {
      entitiesQueue.push(
        deserializeEntity(world, {
          Position: origin,
          RandomFlier:
            i % 3 === 0 ? undefined : { topSpeed: 10 + Math.random() * 100 },
        })
      );
      if (i % 2 === 0) {
        removeEntity(world, entitiesQueue.shift()!);
      }

      stepSystem(world, resource);
    }
    const player = serializeEntity(world, playerId);
    log(player);
    log(logs.length);
    expect(player).toBeDefined();
  });
});

describe("deserializeComponent", () => {
  it("produces the expected object format", () => {
    resetLogger();
    const world = createWorld();
    const id = deserializeEntity(world, {});
    const p = { x: 3, y: 5, z: 9 };
    deserializeComponent(Position, id, p);

    expect(serializeComponent(Position, id)).toMatchObject(p);

    Position.x[id] = 22.5;

    expect(serializeComponent(Position, id)).toMatchObject({
      ...p,
      x: 22.5,
    });
  });
});
