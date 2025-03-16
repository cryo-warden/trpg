import type { Entity } from "../Entity";
import type { System } from "../System";

export default ((engine) => {
  const locationEntities = engine.world.with("location");
  const entities = engine.world.with("contents", "contentsDirtyFlag");
  let isFirstRun = true;
  return () => {
    if (isFirstRun) {
      for (const entity of engine.world.with("contents")) {
        engine.world.addComponent(entity, "contentsDirtyFlag", true);
      }
      isFirstRun = false;
    }
    if (entities.size <= 0) {
      return;
    }
    const locationMap = new Map<Entity, Entity[]>();
    for (const locationEntity of locationEntities) {
      if (locationEntity.location == null) {
        continue;
      }
      if (!locationMap.has(locationEntity.location)) {
        locationMap.set(locationEntity.location, []);
      }
      locationMap.get(locationEntity.location)?.push(locationEntity);
    }
    for (const entity of entities) {
      entity.contents = locationMap.get(entity) ?? [];
      engine.world.removeComponent(entity, "contentsDirtyFlag");
    }
  };
}) satisfies System;
