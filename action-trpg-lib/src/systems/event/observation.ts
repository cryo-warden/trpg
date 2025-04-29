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

    const locationEventSetMap = new Map<Entity, Set<EntityEvent>>();
    for (const entity of locatedObservables) {
      if (!locationEventSetMap.has(entity.location)) {
        locationEventSetMap.set(entity.location, new Set());
      }
      const { observable } = entity;
      entity.observable = [];
      const eventSet = locationEventSetMap.get(entity.location)!;
      for (const event of observable) {
        eventSet.add(event);
      }
    }

    for (const entity of locatedObservers) {
      const events = locationEventSetMap.get(entity.location);
      if (events == null) {
        continue;
      }
      entity.observer.push(...events);
    }
  };
});
