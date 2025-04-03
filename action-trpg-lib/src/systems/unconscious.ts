import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("hp").without("unconscious");
  return () => {
    for (const entity of entities) {
      if (entity.hp <= (entity.cdp ?? 0)) {
        engine.world.addComponent(entity, "unconscious", true);
        if (entity.observable != null) {
          entity.observable.push({ type: "unconscious", entity });
        }
      }
    }
  };
});
