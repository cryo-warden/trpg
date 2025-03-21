import type { Entity } from "../Entity";
import { createSystem } from "../System";

export default createSystem((engine) => {
  const locationEntities = engine.world.with("location");
  const entities = engine.world.with("contents").without("contentsCleanFlag");
  return () => {
    if (entities.size <= 0) {
      return;
    }
    const uncleanContentsEntitySet = new Set<Entity | null>(entities);
    const locationMap = new Map<Entity, Entity[]>();
    for (const locationEntity of locationEntities) {
      if (
        locationEntity.location == null ||
        !uncleanContentsEntitySet.has(locationEntity.location)
      ) {
        continue;
      }
      if (!locationMap.has(locationEntity.location)) {
        locationMap.set(locationEntity.location, []);
      }
      locationMap.get(locationEntity.location)?.push(locationEntity);
    }
    for (const entity of entities) {
      entity.contents = locationMap.get(entity) ?? [];
      engine.world.addComponent(entity, "contentsCleanFlag", true);
    }
  };
});
