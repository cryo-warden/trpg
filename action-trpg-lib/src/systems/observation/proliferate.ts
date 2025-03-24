import type { Entity } from "../../Entity";
import type { Observation } from "../../structures/Observation";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const observers = engine.world.with("location", "observer");
  const observables = engine.world.with("location", "observable");
  return () => {
    const observationMap = new Map<Entity, Observation[]>();
    for (const entity of observables) {
      if (entity.location == null) {
        continue;
      }
      if (entity.observable.length < 1) {
        continue;
      }
      if (!observationMap.has(entity.location)) {
        observationMap.set(entity.location, []);
      }
      observationMap.get(entity.location)?.push(...entity.observable);
    }
    for (const entity of observers) {
      if (entity.location == null) {
        if (entity.observable != null) {
          // Allow self observation even with null location.
          entity.observer.push(...entity.observable);
        }
        continue;
      }
      const observations = observationMap.get(entity.location);
      if (observations == null) {
        continue;
      }
      entity.observer.push(...observations);
    }
  };
});
