import type { System } from "../System";
import {
  applyStatBlock,
  createStatBlock,
  mergeStatBlock,
} from "../structures/StatBlock";

export default ((engine) => {
  const entities = engine.world.with("baseline").without("statsCleanFlag");
  return () => {
    for (const entity of entities) {
      const statBlock = createStatBlock(entity.baseline);

      if (entity.traitsStatBlock != null) {
        mergeStatBlock(statBlock, entity.traitsStatBlock);
      }

      if (entity.equipmentStatBlock != null) {
        mergeStatBlock(statBlock, entity.equipmentStatBlock);
      }

      if (entity.statusStatBlock != null) {
        mergeStatBlock(statBlock, entity.statusStatBlock);
      }

      applyStatBlock(engine, entity, statBlock);

      engine.world.addComponent(entity, "statsCleanFlag", true);
    }
  };
}) satisfies System;
