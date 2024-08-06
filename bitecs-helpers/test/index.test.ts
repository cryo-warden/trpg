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
  createLogger,
  createSystemOf2QueriesDistinct,
  createSystemOfQuery,
  createSystemOfPipeline,
  EntityDataOf,
} from "../src";

import { createSystemRecord } from "./systemRecord";

import { createComponentRecord } from "./componentRecord";
import { mapActivities } from "./componentRecord/ActivityQueue";

const componentRecord = createComponentRecord();
const { Position, ActivityQueue } = componentRecord;

const { playerObserverSystem, randomFlySystem } =
  createSystemRecord(componentRecord);

const { log } = createLogger({ level: 2 });

const createTestLogger = () => {
  let count = 0;
  const { log } = createLogger({
    level: 2,
    onLog: () => {
      count += 1;
    },
  });
  return { count, log };
};

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

const observationLogger = createLogger({ prefix: "OBSERVATION" });

const { serializeComponent, deserializeComponent } = componentSerializer;
const { serializeEntity, deserializeEntity } = createEntitySerializer(
  { addComponent, addEntity, getEntityComponents },
  componentRecord
);

type EntityData = EntityDataOf<typeof serializeEntity>;

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

describe("deserializeComponent", () => {
  it("produces the expected object format", () => {
    const world = createWorld();
    const id = deserializeEntity(world, {});
    const p = { x: 3, y: 5, z: 9 };
    addComponent(world, Position, id);
    deserializeComponent(Position, id, p);

    expect(serializeComponent(Position, id)).toMatchObject(p);

    Position.x[id] = 22.5;

    expect(serializeComponent(Position, id)).toMatchObject({
      ...p,
      x: 22.5,
    });
  });

  it("with a mapped component, produces the expected object format", () => {
    const world = createWorld();
    const id = deserializeEntity(world, {});
    const rawA = {
      activities: [1, 3, 8, 2],
    };
    const a = {
      activities: mapActivities(rawA.activities),
    };
    addComponent(world, ActivityQueue, id);

    deserializeComponent(ActivityQueue, id, a);

    expect(serializeComponent(ActivityQueue, id)).toMatchObject(a);

    ActivityQueue.activities[id][2] = 7;

    expect(serializeComponent(ActivityQueue, id)).toMatchObject({
      ...a,
      activities: a.activities.map((v, i) =>
        i === 2 ? "Remove Left Sock" : v
      ),
    });
  });
});

describe("deserializeEntity", () => {
  it("creates the expected entities with the expected component values", () => {
    const logger = createTestLogger();
    const world = createWorld();
    const playerId = deserializeEntity(world, {
      Player: {},
      Position: origin,
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
    logger.log(player);
    logger.log(logger.count);
    expect(player).toBeDefined();
  });

  it("correctly uses a mapper", () => {
    const world = createWorld();
    const playerData: EntityData = {
      Player: {},
      Position: origin,
      ActivityQueue: { activities: mapActivities([1, 2, 3, 4]) },
    };
    const otherData: EntityData = {
      Position: origin,
      RandomFlier: { topSpeed: 10 },
      ActivityQueue: { activities: mapActivities([5, 6, 5, 6]) },
    };
    const playerId = deserializeEntity(world, playerData);
    deserializeEntity(world, otherData);
    deserializeEntity(world, otherData);
    deserializeEntity(world, otherData);
    stepSystem(world, resource);

    const serializedPlayer = serializeEntity(world, playerId);
    expect(serializedPlayer).toMatchObject(playerData);
  });

  it("should update a world repeatedly", () => {
    const logger = createTestLogger();
    const world = createWorld();
    const playerId = deserializeEntity(world, {
      Player: {},
      Position: origin,
    });
    let entitiesQueue: number[] = [];
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
    logger.log(player);
    logger.log(logger.count);
    expect(player).toBeDefined();
  });
});
