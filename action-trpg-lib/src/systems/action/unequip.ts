import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "unequip",
    (_unequipEffect, entity, target) => {
      if (
        target.location !== entity ||
        entity.equipment == null ||
        target.equippable == null
      ) {
        return;
      }

      const equippedIndex = entity.equipment.indexOf(target);
      if (equippedIndex < 0) {
        return;
      }

      entity.equipment.splice(equippedIndex, 1);
      engine.world.removeComponent(entity, "equipmentStatBlockCleanFlag");
    }
  );
});
