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
  createComponentSerializer,
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
    const logger = createTestLogger();
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
    logger.log(player);
    logger.log(logger.count);
    expect(player).toBeDefined();
  });

  it("should update a world repeatedly", () => {
    const logger = createTestLogger();
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
    logger.log(player);
    logger.log(logger.count);
    expect(player).toBeDefined();
  });
});

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

  describe("deserializeComponent with a Mapper", () => {
    it("produces the expected object format", () => {
      const world = createWorld();
      const id = deserializeEntity(world, {});
      const activitiesList = [
        "NULL",
        "Wake Up",
        "Brush Teeth",
        "Put On Left Sock",
        "Put On Right Sock",
        "Examine Worrisome Growth",
        "Refuse To Contemplate Mortality",
        "Remove Left Sock",
        "Remove Right Sock",
      ];
      const activityQueueSerializer = createComponentSerializer(ActivityQueue, {
        serialize: (value) => ({
          ...value,
          activities: value.activities.map((v) => activitiesList[v]),
        }),
        deserialize: (value: any) => ({
          ...value,
          activities: value.activities.map((v: string) =>
            activitiesList.indexOf(v)
          ),
        }),
      });
      const a = {
        activities: [
          "Wake Up",
          "Put On Left Sock",
          "Remove Right Sock",
          "Brush Teeth",
        ],
      };
      addComponent(world, ActivityQueue, id);
      activityQueueSerializer.deserializeComponent(id, a);

      expect(activityQueueSerializer.serializeComponent(id)).toMatchObject(a);

      console.log(serializeComponent(ActivityQueue, id));
      console.log(activityQueueSerializer.serializeComponent(id));

      // Position.x[id] = 22.5;

      // expect(serializeComponent(Position, id)).toMatchObject({
      //   ...p,
      //   x: 22.5,
      // });
    });
  });
});
