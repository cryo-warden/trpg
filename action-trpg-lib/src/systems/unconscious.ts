import { applyEvent } from "../structures/EntityEvent";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("hp").without("unconscious");
  return () => {
    for (const entity of entities) {
      if (entity.hp <= (entity.cdp ?? 0)) {
        applyEvent(engine, {
          type: "unconscious",
          source: entity, // TODO Track last-attack-attribution to fix this source.
          target: entity,
        });
      }
    }
  };
});
