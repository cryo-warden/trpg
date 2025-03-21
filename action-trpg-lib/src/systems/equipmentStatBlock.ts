import {
  createStatBlock,
  mergeStatBlock,
  type StatBlock,
} from "../structures/StatBlock";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world
    .with("equipment")
    .without("equipmentStatBlockCleanFlag");
  return () => {
    for (const entity of entities) {
      let equipmentStatBlock: StatBlock = createStatBlock({});
      for (const { equippable } of entity.equipment) {
        if (equippable != null) {
          mergeStatBlock(equipmentStatBlock, equippable.statBlock);
        }
      }
      engine.world.addComponent(
        entity,
        "equipmentStatBlock",
        equipmentStatBlock
      );
      entity.equipmentStatBlock = equipmentStatBlock;

      engine.world.addComponent(entity, "equipmentStatBlockCleanFlag", true);
      engine.world.removeComponent(entity, "statsCleanFlag");
    }
  };
});
