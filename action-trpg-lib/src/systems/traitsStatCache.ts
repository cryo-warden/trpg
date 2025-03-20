import {
  createStatBlock,
  mergeStatBlock,
  type StatBlock,
} from "../structures/StatBlock";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world
    .with("traits")
    .without("traitsStatBlockCleanFlag");
  return () => {
    for (const entity of entities) {
      let traitsStatBlock: StatBlock = createStatBlock({});
      for (const trait of entity.traits) {
        mergeStatBlock(traitsStatBlock, trait);
      }
      engine.world.addComponent(entity, "traitsStatBlock", traitsStatBlock);
      entity.traitsStatBlock = traitsStatBlock;

      engine.world.addComponent(entity, "traitsStatBlockCleanFlag", true);
      engine.world.removeComponent(entity, "statsCleanFlag");
    }
  };
}) satisfies System;
