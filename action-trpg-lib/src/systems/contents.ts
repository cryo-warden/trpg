import type { Entity } from "../Entity";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const locationEntities = engine.world.with("location");
  const entities = engine.world.with("contents").without("contentsCleanFlag");
  return () => {
    if (entities.size <= 0) {
      return;
    }
    const uncleanContentsEntitySet = new Set<Entity | null>(entities);
    const contentsMap = new Map<Entity, Entity[]>();
    for (const locationEntity of locationEntities) {
      if (!uncleanContentsEntitySet.has(locationEntity.location)) {
        continue;
      }
      if (!contentsMap.has(locationEntity.location)) {
        contentsMap.set(locationEntity.location, []);
      }
      contentsMap.get(locationEntity.location)?.push(locationEntity);
    }
    for (const entity of entities) {
      entity.contents = contentsMap.get(entity) ?? [];
      engine.world.addComponent(entity, "contentsCleanFlag", true);
    }
  };
});
