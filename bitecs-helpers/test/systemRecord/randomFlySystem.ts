import { defineQuery } from "bitecs";
import { createResourceSystem } from "../../src";
import { ComponentRecord } from "../componentRecord";

export const randomFlySystem = ({ Position, RandomFlier }: ComponentRecord) =>
  createResourceSystem({
    query: defineQuery([Position, RandomFlier]),
    action: () => (id) => {
      Position.x[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
      Position.y[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
      Position.z[id] += 2 * (Math.random() - 0.5) * RandomFlier.topSpeed[id];
    },
  });
