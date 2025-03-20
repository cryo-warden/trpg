import { type StatBlock } from "../structures/StatBlock";
import { createStatusStatBlock } from "../structures/StatusEffectMap";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world
    .with("status")
    .without("statusStatBlockCleanFlag");
  return () => {
    for (const entity of entities) {
      const statusStatBlock: StatBlock = createStatusStatBlock(entity.status);

      engine.world.addComponent(entity, "statusStatBlock", statusStatBlock);
      entity.statusStatBlock = statusStatBlock;

      engine.world.addComponent(entity, "statusStatBlockCleanFlag", true);
      engine.world.removeComponent(entity, "statsCleanFlag");
    }
  };
}) satisfies System;
