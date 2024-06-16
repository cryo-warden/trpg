import { describe, it, expect } from "bun:test";
import { create } from "../src";

describe("trpg-lib", () => {
  describe("create", () => {
    it("should create a world instance", () => {
      const world = create();
      expect(world.createEntity).toBeFunction();
      expect(world.destroyEntity).toBeFunction();
      expect(world.getActor).toBeFunction();
      expect(world.getObserver).toBeFunction();
      expect(world.step).toBeFunction();
    });

    describe("world instance", () => {
      it("create entities", () => {
        const world = create();
        const ids = [
          world.createEntity({}),
          world.createEntity({}),
          world.createEntity({}),
        ];
        expect(ids).toBeArrayOfSize(3);
        for (let i = 0; i < ids.length; ++i) {
          expect(ids[i]).toBeNumber();
        }
      });
    });

    describe("world instance activity", () => {
      const world = create();

      const player = world.createEntity({
        Player: {},
        Counter: { value: 0 },
      });

      for (let i = 0; i < 5; i++) {
        world.createEntity({
          Counter: { value: Math.floor(Math.random() * 100 - 50) },
        });
      }

      for (let i = 0; i < 100; i++) {
        world.step();
      }

      console.log(world.destroyEntity(player));
      console.log(world.destroyEntity(3));
    });
  });
});
