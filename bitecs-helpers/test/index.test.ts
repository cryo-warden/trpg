import { describe, it, expect } from "bun:test";
import { createWorld, removeEntity } from "bitecs";

import {
  componentSerializer,
  createEntitySerializer,
  type EntityId,
  createLogger,
  createPipeline,
} from "../src";

import { ActivityQueue } from "./components/ActivityQueue";
import { Player } from "./components/Player";
import { Position } from "./components/Position";
import { RandomFlier } from "./components/RandomFlier";
import { randomFlySystem } from "./systems/randomFlySystem";
import { createPlayerObserverSystem } from "./systems/playerObserverSystem";

const {
  logs,
  reset: resetLogger,
  log,
} = createLogger({
  // onLog: console.log,
});

const observationLogger = createLogger();

const { serializeComponent, deserializeComponent } = componentSerializer;
const { serializeEntity, deserializeEntity } = createEntitySerializer({
  ActivityQueue,
  Position,
  Player,
  RandomFlier,
});

const step = createPipeline(
  randomFlySystem,
  createPlayerObserverSystem(observationLogger.log)
);

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
    step(world);

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

      step(world);
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
