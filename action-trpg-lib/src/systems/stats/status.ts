import type { EngineResource } from "../../structures/Resource";
import { type StatBlock } from "../../structures/StatBlock";
import { createStatusStatBlock } from "../../structures/StatusEffectMap";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  type Resource = EngineResource<typeof engine>;
  const entities = engine.world.without("statusStatBlockCleanFlag");
  return () => {
    for (const entity of entities) {
      const statusStatBlock: StatBlock<Resource> =
        createStatusStatBlock(entity);

      engine.world.addComponent(entity, "statusStatBlock", statusStatBlock);
      entity.statusStatBlock = statusStatBlock;

      engine.world.addComponent(entity, "statusStatBlockCleanFlag", true);
      engine.world.removeComponent(entity, "statsCleanFlag");
    }
  };
});
