import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("cdp", "mhp");
  return () => {
    for (const entity of entities) {
      if (entity.cdp >= entity.mhp) {
        engine.world.addComponent(entity, "dead", true);
      }
    }
  };
});
