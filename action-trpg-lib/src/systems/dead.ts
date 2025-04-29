import { applyEvent } from "../structures/EntityEvent";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("cdp", "mhp").without("dead");
  return () => {
    for (const entity of entities) {
      if (entity.cdp >= entity.mhp) {
        applyEvent(engine, {
          type: "dead",
          source: entity,
          target: entity,
        });
      }
    }
  };
});
