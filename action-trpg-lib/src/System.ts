import type { World } from "./World";

export const bindSystems: (
  systems: ((world: World) => () => void)[],
  world: World
) => () => void = (systems, world) => {
  const boundSystems = systems.map((system) => system(world));
  return () => {
    for (const boundSystem of boundSystems) {
      boundSystem();
    }
  };
};
