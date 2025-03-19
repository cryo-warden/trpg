import type { System } from "../System";
import { applyBaseline } from "../structures/Baseline";
import { applyTrait } from "../structures/Trait";

export default ((engine) => {
  const entities = engine.world.with("baseline").without("statsCleanFlag");
  return () => {
    for (const entity of entities) {
      applyBaseline(engine, entity, entity.baseline);

      if (entity.traitsStatCache != null) {
        applyTrait(entity, entity.traitsStatCache);
      }

      if (entity.equipmentStatCache != null) {
        applyTrait(entity, entity.equipmentStatCache);
      }

      if (entity.statusStatCache != null) {
        applyTrait(entity, entity.statusStatCache);
      }

      engine.world.addComponent(entity, "statsCleanFlag", true);
    }
  };
}) satisfies System;
