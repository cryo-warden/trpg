import { System } from "bitecs";

export type Clock = { dt: number; now: number };

export const clockSystem: System<[Clock]> = (world, clock) => {
  clock.now += clock.dt;

  return world;
};
