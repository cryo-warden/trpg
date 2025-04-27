import type { Engine } from "./Engine";
import type { Resource } from "./Resource";

export type System = <TResource extends Resource<TResource>>(
  engine: Engine<TResource>
) => () => void;

export const joinSystems: (systems: System[]) => System =
  (systems) => (engine) => {
    const boundSystems = systems.map((system) => system(engine));
    return () => {
      for (const boundSystem of boundSystems) {
        boundSystem();
      }
    };
  };

export const periodicSystem: (periodMS: number, system: System) => System =
  (periodMS, system) => (engine) => {
    const boundSystem = system(engine);
    /** The next time this periodic system should update. */
    let nextTimeMS = engine.time + periodMS;
    return () => {
      while (engine.time >= nextTimeMS) {
        boundSystem();
        nextTimeMS += periodMS;
      }
    };
  };

export * from "./systems";
