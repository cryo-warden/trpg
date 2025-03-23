import type { Entity } from "../Entity";
import { createSystem } from "./createSystem";

/** Flatten all allegiances to the topmost Entity in the allegiance tree. */
export default createSystem((engine) => {
  const entities = engine.world.with("allegiance");
  return () => {
    for (const entity of entities) {
      if (entity.allegiance === entity) {
        continue;
      }

      const allegianceSet = new Set<Entity>();
      while (entity.allegiance.allegiance != null) {
        if (allegianceSet.has(entity.allegiance)) {
          throw new Error("Cyclic allegiance detected.");
        }
        allegianceSet.add(entity.allegiance);
        entity.allegiance = entity.allegiance.allegiance;
      }
    }
  };
});
