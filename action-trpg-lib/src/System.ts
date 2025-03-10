import type { Engine } from "./Engine";
export * from "./systems";

export type BoundSystem = () => void;

export type System = (engine: Engine) => BoundSystem;

export const bindSystems: (systems: System[], engine: Engine) => BoundSystem = (
  systems,
  world
) => {
  const boundSystems = systems.map((system) => system(world));
  return () => {
    for (const boundSystem of boundSystems) {
      boundSystem();
    }
  };
};

export const periodicSystem: (periodMS: number, system: System) => System =
  (periodMS, system) => (engine) => {
    const boundSystem = system(engine);
    /** The last time this periodic system updated. */
    let lastTimeMS = engine.time - (engine.time % periodMS);
    return () => {
      while (engine.time > lastTimeMS + periodMS) {
        boundSystem();
        lastTimeMS += periodMS;
      }
    };
  };
