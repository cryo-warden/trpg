import { trait, type Trait } from "../structures/Trait";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world
    .with("traits")
    .without("traitsStatCacheCleanFlag");
  return () => {
    for (const entity of entities) {
      let traitsStatCache: Trait = trait.zero;
      for (const t of entity.traits) {
        traitsStatCache = trait.merge(traitsStatCache, t);
      }
      engine.world.addComponent(entity, "traitsStatCache", traitsStatCache);
      entity.traitsStatCache = traitsStatCache;

      engine.world.addComponent(entity, "traitsStatCacheCleanFlag", true);
      engine.world.removeComponent(entity, "statsCleanFlag");
    }
  };
}) satisfies System;
