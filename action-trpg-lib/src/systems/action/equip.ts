import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "equip",
    (_equipEffect, entity, target) => {
      if (entity.equipment == null || entity.contents == null) {
        return;
      }

      entity.equipment.push(target);
      engine.world.removeComponent(entity, "equipmentStatBlockCleanFlag");
    }
  );
});
