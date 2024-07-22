import { ResourceSystem } from "bitecs-helpers";

export type Clock = {
  now: number;
  deltaTimeSeconds: number;
};

export const createClock = (): Clock => ({
  now: Date.now() / 1000,
  deltaTimeSeconds: 0,
});

// TODO Add the ability to create different clocks with different names in the resources, and include another system here to allow a clock to pause. Consider whether clocks should be entities rather than resources.

export const clockSystem: ResourceSystem<{ clock: Clock }> =
  ({ clock }) =>
  (world) => {
    const now = Date.now() / 1000;
    clock.deltaTimeSeconds = now - clock.now;
    clock.now = now;

    return world;
  };
