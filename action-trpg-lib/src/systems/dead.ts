import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("cdp", "mhp").without("dead");
  return () => {
    for (const entity of entities) {
      if (entity.cdp >= entity.mhp) {
        engine.world.addComponent(entity, "dead", true);
        if (entity.observable != null) {
          entity.observable.push({ type: "dead", entity });
        }
      }
    }
  };
});
