import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("fortify");
  return () => {
    for (const entity of entities) {
      entity.fortify.duration -= 1;
      if (entity.fortify.duration <= 0) {
        engine.world.removeComponent(entity, "fortify");
        engine.world.removeComponent(entity, "statusStatBlockCleanFlag");
      }
    }
  };
});
