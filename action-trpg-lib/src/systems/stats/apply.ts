import { applyEvent } from "../../structures/EntityEvent";
import { createStatBlock, mergeStatBlock } from "../../structures/StatBlock";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("baseline").without("statsCleanFlag");
  return () => {
    for (const entity of entities) {
      const baseline = engine.resource.baselineRecord[entity.baseline];
      const statBlock = createStatBlock(baseline.statBlock);

      if (entity.traitsStatBlock != null) {
        mergeStatBlock(statBlock, entity.traitsStatBlock);
      }

      if (entity.equipmentStatBlock != null) {
        mergeStatBlock(statBlock, entity.equipmentStatBlock);
      }

      if (entity.statusStatBlock != null) {
        mergeStatBlock(statBlock, entity.statusStatBlock);
      }

      applyEvent(engine, entity, {
        type: "stats",
        source: entity,
        statBlock,
      });
    }
  };
});
