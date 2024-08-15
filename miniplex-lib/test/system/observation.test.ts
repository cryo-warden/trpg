import { describe, it, expect } from "bun:test";
import {
  createVector,
  createWorld,
  copy,
  Vector,
  createObservationSystem,
} from "../../src";

describe("observationSystem", () => {
  it("iterates correctly", () => {
    const world = createWorld();

    const observationSystem = createObservationSystem(world);

    const observer = world.add({
      position: createVector(),
      observer: { range: 30, observationMap: new Map() },
    });

    const createCase = (
      start: Vector,
      name: string,
      description: string,
      isObserved: boolean
    ) => {
      return {
        start,
        entity: world.add({
          position: copy(start),
          observable: {
            range: 200,
            appearance: {
              name,
              description,
            },
          },
        }),
        isObserved,
      };
    };

    const cases = [
      createCase(
        createVector(),
        "Near Observable",
        "An observable thing nearby.",
        true
      ),
      createCase(
        createVector(20),
        "Off Observable",
        "An observable thing a little ways off.",
        true
      ),
      createCase(
        createVector(150),
        "Distant Observable",
        "An observable thing in the distance.",
        true
      ),
      createCase(
        createVector(250),
        "Too Far Observable",
        "An observable thing too far to see.",
        false
      ),
    ];

    for (let i = 0; i < 120; ++i) {
      observationSystem(1 / 60);
    }

    expect(cases).toBeDefined();

    for (const { entity, isObserved } of cases) {
      expect(observer.observer.observationMap.has(entity)).toBe(isObserved);
    }
  });
});
