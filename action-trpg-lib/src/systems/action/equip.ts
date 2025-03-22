import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "equip",
    (_equipEffect, entity, target) => {
      if (
        target.equippable == null ||
        target.location !== entity ||
        entity.equipment == null ||
        entity.contents == null
      ) {
        return;
      }

      if (!entity.contents.includes(target)) {
        return;
      }

      if (entity.equipment.includes(target)) {
        return;
      }

      entity.equipment.push(target);
      engine.world.removeComponent(entity, "equipmentStatBlockCleanFlag");
    }
  );
});
