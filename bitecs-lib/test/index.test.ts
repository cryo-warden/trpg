import { describe, it, expect } from "bun:test";
import { EntityId, createEngine } from "../src";
import { componentRecord } from "./componentRecord";
import { playerObservationSystem, randomWalkSystem } from "./system";
import { createWorld, hasComponent } from "bitecs";

describe("bitecs-lib", () => {
  describe("createEngine", () => {
    it("should create an engine", () => {
      const engine = createEngine(componentRecord, []);
      expect(engine).toBeDefined();
    });

    it("should create an engine with a system", () => {
      const engine = createEngine(componentRecord, [randomWalkSystem]);
      expect(engine).toBeDefined();
    });

    it("should create an engine with multiple systems", () => {
      const world = createEngine(componentRecord, [
        randomWalkSystem,
        playerObservationSystem,
      ]);
      expect(world).toBeDefined();
    });

    describe(".step", () => {
      it("should update a world at least once", () => {
        const world = createWorld();
        const engine = createEngine(componentRecord, [
          randomWalkSystem,
          playerObservationSystem,
        ]);
        engine.addEntity(world, {
          Player: {},
          Position: { x: 0, y: 0, z: 0 },
          ActivityQueue: {
            activities: [1, 2, 3, 4],
          },
        });
        engine.addEntity(world, {
          Position: { x: 0, y: 0, z: 0 },
          RandomFlier: { topSpeed: 0 },
        });
        engine.addEntity(world, {
          Position: { x: 0, y: 0, z: 0 },
          RandomFlier: { topSpeed: 10 },
        });
        engine.addEntity(world, {
          Position: { x: 0, y: 0, z: 0 },
          RandomFlier: { topSpeed: 20 },
        });
        engine.step(world);
        expect(engine).toBeDefined();
      });

      it("should update a world repeatedly", () => {
        const world = createWorld();
        const engine = createEngine(componentRecord, [
          randomWalkSystem,
          playerObservationSystem,
        ]);
        engine.addEntity(world, {
          Player: {},
          Position: { x: 0, y: 0, z: 0 },
        });
        let entitiesQueue: EntityId[] = [];
        for (let i = 0; i < 100; i++) {
          console.log(`Entities Queue is ${entitiesQueue.join(", ")}.`);
          entitiesQueue.push(
            engine.addEntity(world, {
              Position: { x: 0, y: 0, z: 0 },
              RandomFlier:
                i % 3 === 0
                  ? undefined
                  : { topSpeed: 10 + Math.random() * 100 },
            })
          );
          if (i % 2 === 0) {
            engine.removeEntity(world, entitiesQueue.shift()!);
          }

          engine.step(world);
        }
        expect(engine).toBeDefined();
      });
    });

    describe(".flushUpdates", () => {
      it("it performs updates which are waiting in the queue", () => {
        const world = createWorld();
        const engine = createEngine(componentRecord, []);
        const id = engine.addEntity(world, { Position: { x: 0, y: 0, z: 0 } });
        const Position = engine.getComponent("Position");
        expect(hasComponent(world, Position, id)).toBe(false);

        engine.flushUpdates();

        expect(hasComponent(world, Position, id)).toBe(true);
      });
    });

    describe(".readComponent", () => {
      it("produces the expected object format", () => {
        const world = createWorld();
        const engine = createEngine(componentRecord, []);
        const id = engine.addEntity(world, {});
        const p = { x: 3, y: 5, z: 9 };
        engine.addComponent(world, id, "Position", p);

        engine.flushUpdates();

        expect(engine.readComponent(id, "Position")).toMatchObject(p);

        componentRecord.Position.x[id] = 22.5;

        expect(engine.readComponent(id, "Position")).toMatchObject({
          ...p,
          x: 22.5,
        });
      });
    });
  });
});
