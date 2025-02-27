import { describe, it, expect } from "bun:test";
import {
  createVector,
  createMovementSystem,
  createWorld,
  gridDistance,
  copy,
  Vector,
} from "../../src";

describe("movementSystem", () => {
  it("iterates correctly", () => {
    const world = createWorld();

    const movementSystem = createMovementSystem(world);

    const createCase = (
      start: Vector,
      velocity: Vector,
      expectedDistance: number
    ) => {
      return {
        start,
        entity: world.add({
          position: copy(start),
          velocity,
        }),
        expectedDistance,
      };
    };

    const cases = [
      createCase(createVector(), createVector(), 0),
      createCase(createVector(), createVector(1), 2),
      createCase(createVector(), createVector(1, -1), 2),
      createCase(createVector(), createVector(2, 1), 4),
    ];

    for (let i = 0; i < 120; ++i) {
      movementSystem(1 / 60);
    }

    for (const {
      entity: { position },
      start,
      expectedDistance,
    } of cases) {
      const d = gridDistance(start, position);

      expect(d).toBeCloseTo(expectedDistance);
    }
  });
});
