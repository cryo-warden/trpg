import { defineQuery } from "bitecs";
import { createSystem } from "../../src";
import { Position } from "../components/Position";
import { RandomFlier } from "../components/RandomFlier";

export const randomFlySystem = createSystem({
  query: defineQuery([Position, RandomFlier]),
  action: (id) => {
    Position.x[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
    Position.y[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
    Position.z[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
  },
});
