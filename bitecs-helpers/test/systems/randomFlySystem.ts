import { defineQuery } from "bitecs";
import { createSystemOfQuery } from "../../src";
import { Position } from "../components/Position";
import { RandomFlier } from "../components/RandomFlier";

export const randomFlySystem = createSystemOfQuery(
  defineQuery([Position, RandomFlier]),
  (id) => {
    Position.x[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
    Position.y[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
    Position.z[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
  }
);
