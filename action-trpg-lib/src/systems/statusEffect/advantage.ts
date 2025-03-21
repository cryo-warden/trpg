import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("advantage");
  return () => {
    for (const entity of entities) {
      entity.advantage.duration -= 1;
      if (entity.advantage.duration <= 0) {
        engine.world.removeComponent(entity, "advantage");
        engine.world.removeComponent(entity, "statusStatBlockCleanFlag");
      }
    }
  };
});
