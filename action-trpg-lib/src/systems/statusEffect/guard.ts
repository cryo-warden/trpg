import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("guard");
  return () => {
    for (const entity of entities) {
      entity.guard.duration -= 1;
      if (entity.guard.duration <= 0) {
        engine.world.removeComponent(entity, "guard");
        engine.world.removeComponent(entity, "statusStatBlockCleanFlag");
      }
    }
  };
});
