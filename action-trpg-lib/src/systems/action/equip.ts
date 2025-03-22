import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "equip",
    (_equipEffect, entity, target) => {
      if (
        target.location !== entity ||
        entity.equipment == null ||
        target.equippable == null
      ) {
        return;
      }

      const alreadyEquipped = entity.equipment.includes(target);
      if (alreadyEquipped) {
        return;
      }

      entity.equipment.push(target);
      engine.world.removeComponent(entity, "equipmentStatBlockCleanFlag");
    }
  );
});
