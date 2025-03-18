import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("baseline").without("statsCleanFlag");
  return () => {
    for (const entity of entities) {
      for (const [key, value] of Object.entries(entity.baseline)) {
        (entity as any)[key] = value;
      }
      if (entity.traits != null) {
        for (const trait of entity.traits) {
          for (const [key, value] of Object.entries(trait)) {
            (entity as any)[key] += value; // Combine non-numeric stats too.
          }
        }
      }
      if (entity.equipment != null) {
        for (const equipment of entity.equipment) {
          if (equipment.equippable == null) {
            continue;
          }
          for (const [key, value] of Object.entries(
            equipment.equippable.statBlock
          )) {
            (entity as any)[key] += value; // Combine non-numeric stats too.
          }
        }
      }
      engine.world.addComponent(entity, "statsCleanFlag", true);
    }
  };
}) satisfies System;
