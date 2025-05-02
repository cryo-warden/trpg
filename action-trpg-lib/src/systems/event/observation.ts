import type { EngineEntity } from "../../Entity";
import type { EngineEntityEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  type Entity = EngineEntity<typeof engine>;
  type EntityEvent = EngineEntityEvent<typeof engine>;
  const unlocatedSelfObservers = engine.world
    .with("observable", "observer")
    .without("location");
  const locatedObservers = engine.world.with("location", "observer");
  const locatedObservables = engine.world.with("location", "observable");

  return () => {
    // Allow self observation even without location.
    for (const entity of unlocatedSelfObservers) {
      const { observable } = entity;
      entity.observable = [];
      entity.observer.push(...observable);
    }

    const locationObservationSetMap = new Map<Entity, Set<EntityEvent>>();
    for (const entity of locatedObservables) {
      if (!locationObservationSetMap.has(entity.location)) {
        locationObservationSetMap.set(entity.location, new Set());
      }
      const { observable } = entity;
      entity.observable = [];
      const observationSet = locationObservationSetMap.get(entity.location)!;
      for (const observation of observable) {
        observationSet.add(observation);
      }
    }

    for (const entity of locatedObservers) {
      const observations = locationObservationSetMap.get(entity.location);
      if (observations == null) {
        continue;
      }
      entity.observer.push(...observations);
    }
  };
});
