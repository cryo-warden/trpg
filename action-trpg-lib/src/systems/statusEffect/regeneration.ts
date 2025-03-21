import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("regeneration");
  return () => {
    for (const entity of entities) {
      if (entity.regeneration.delay > 0) {
        entity.regeneration.delay -= 1;
      } else {
        engine.world.addComponent(entity, "accumulatedHealing", 0);
        if (entity.accumulatedHealing != null) {
          entity.accumulatedHealing += entity.regeneration.heal;
        }
        entity.regeneration.duration -= 1;
        if (entity.regeneration.duration <= 0) {
          engine.world.removeComponent(entity, "regeneration");
        }
      }
    }
  };
});
