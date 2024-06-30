import { describe, it, expect } from "bun:test";
import { System, defineQuery } from "bitecs";
import { Types, EntityId, asComponentRecord, createWorld } from "../src";

const componentRecord = asComponentRecord({
  Player: {},
  Position: {
    x: Types.f64,
    y: Types.f64,
    z: Types.f64,
  },
  RandomFlier: {
    topSpeed: Types.f64,
  },
} as const);

const { Player, Position, RandomFlier } = componentRecord;

const playerQuery = defineQuery([Player]);
const positionQuery = defineQuery([Position]);
const randomFlierPositionQuery = defineQuery([Position, RandomFlier]);

const randomWalkSystem: System = (world) => {
  const entities = randomFlierPositionQuery(world);
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    Position.x[entity] +=
      2 * (Math.random() - 0.5) * RandomFlier.topSpeed[entity];
    Position.y[entity] +=
      2 * (Math.random() - 0.5) * RandomFlier.topSpeed[entity];
    Position.z[entity] +=
      2 * (Math.random() - 0.5) * RandomFlier.topSpeed[entity];
  }
  return world;
};

const playerObservationSystem: System = (world) => {
  const players = playerQuery(world);
  const entities = positionQuery(world);
  for (let i = 0; i < players.length; i++) {
    const playerId = players[i];
    for (let j = 0; j < entities.length; j++) {
      const entityId = entities[j];
      if (playerId === entityId) {
        continue;
      }

      const distance = Math.hypot(
        Position.x[playerId] - Position.x[entityId],
        Position.y[playerId] - Position.y[entityId],
        Position.z[playerId] - Position.z[entityId]
      );
      console.log(`Something ${entityId} is ${distance} away.`);
    }
  }
  return world;
};

describe("bitecs-lib", () => {
  describe("create", () => {
    it("should create a world", () => {
      const world = createWorld(componentRecord, []);
      expect(world).toBeDefined();
    });
    it("should create a world with a system", () => {
      const world = createWorld(componentRecord, [randomWalkSystem]);
      expect(world).toBeDefined();
    });
    it("should create a world with multiple systems", () => {
      const world = createWorld(componentRecord, [
        randomWalkSystem,
        playerObservationSystem,
      ]);
      expect(world).toBeDefined();
    });
    it("should update a world on step", () => {
      const world = createWorld(componentRecord, [
        randomWalkSystem,
        playerObservationSystem,
      ]);
      world.addEntity({
        Player: {},
        Position: { x: 0, y: 0, z: 0 },
      });
      world.addEntity({
        Position: { x: 0, y: 0, z: 0 },
        RandomFlier: { topSpeed: 0 },
      });
      world.addEntity({
        Position: { x: 0, y: 0, z: 0 },
        RandomFlier: { topSpeed: 10 },
      });
      world.addEntity({
        Position: { x: 0, y: 0, z: 0 },
        RandomFlier: { topSpeed: 20 },
      });
      world.step();
      expect(world).toBeDefined();
    });
    it("should update a world many times on many steps", () => {
      const world = createWorld(componentRecord, [
        randomWalkSystem,
        playerObservationSystem,
      ]);
      world.addEntity({
        Player: {},
        Position: { x: 0, y: 0, z: 0 },
      });
      let entitiesQueue: EntityId[] = [];
      for (let i = 0; i < 100; i++) {
        console.log(`Entities Queue is ${entitiesQueue.join(", ")}.`);
        entitiesQueue.push(
          world.addEntity({
            Position: { x: 0, y: 0, z: 0 },
            RandomFlier:
              i % 3 === 0 ? undefined : { topSpeed: 10 + Math.random() * 100 },
          })
        );
        if (i % 2 === 0) {
          world.removeEntity(entitiesQueue.shift()!);
        }

        world.step();
      }
      expect(world).toBeDefined();
    });
  });
});
