import { createStatBlock, mergeStatBlock } from "../../structures/StatBlock";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world
    .with("traits")
    .without("traitsStatBlockCleanFlag");
  return () => {
    for (const entity of entities) {
      let traitsStatBlock = createStatBlock({});
      for (const trait of entity.traits) {
        mergeStatBlock(
          traitsStatBlock,
          engine.resource.traitRecord[trait].statBlock
        );
      }
      engine.world.addComponent(entity, "traitsStatBlock", traitsStatBlock);
      entity.traitsStatBlock = traitsStatBlock;

      engine.world.addComponent(entity, "traitsStatBlockCleanFlag", true);
      engine.world.removeComponent(entity, "statsCleanFlag");
    }
  };
});
