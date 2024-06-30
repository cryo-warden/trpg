import { describe, it, expect } from "bun:test";
import { EntityId, createWorld } from "../src";
import { componentRecord } from "./componentRecord";
import { playerObservationSystem, randomWalkSystem } from "./system";
import { hasComponent } from "bitecs";
import { Position } from "./schema";

describe("bitecs-lib", () => {
  describe("createWorld", () => {
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

    describe("world.step", () => {
      it("should update a world at least once", () => {
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

      it("should update a world repeatedly", () => {
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
                i % 3 === 0
                  ? undefined
                  : { topSpeed: 10 + Math.random() * 100 },
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

    describe("world.flushUpdates", () => {
      it("it performs updates which are waiting in the queue", () => {
        const world = createWorld(componentRecord, []);
        const id = world.addEntity({ Position: { x: 0, y: 0, z: 0 } });
        expect(world.hasComponent(id, "Position")).toBe(false);

        world.flushUpdates();

        expect(world.hasComponent(id, "Position")).toBe(true);
      });
    });

    describe("world.readComponent", () => {
      it("produces the expected object format", () => {
        const world = createWorld(componentRecord, []);
        const id = world.addEntity({});
        world.addComponent(id, "Position", { x: 4, y: 9, z: 19 });

        world.flushUpdates();

        expect(world.readComponent(id, "Position")).toMatchObject({
          x: 4,
          y: 9,
          z: 19,
        });

        componentRecord.Position.x[id] = 22.5;

        expect(world.readComponent(id, "Position")).toMatchObject({
          x: 22.5,
          y: 9,
          z: 19,
        });
      });
    });
  });
});
