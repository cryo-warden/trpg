import { trait, type Trait } from "../structures/Trait";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world
    .with("equipment")
    .without("equipmentStatCacheCleanFlag");
  return () => {
    for (const entity of entities) {
      let equipmentStatCache: Trait = trait.zero;
      for (const e of entity.equipment) {
        if (e.equippable != null) {
          equipmentStatCache = trait.merge(
            equipmentStatCache,
            e.equippable.trait
          );
        }
      }
      engine.world.addComponent(
        entity,
        "equipmentStatCache",
        equipmentStatCache
      );
      entity.equipmentStatCache = equipmentStatCache;

      engine.world.addComponent(entity, "equipmentStatCacheCleanFlag", true);
      engine.world.removeComponent(entity, "statsCleanFlag");
    }
  };
}) satisfies System;
