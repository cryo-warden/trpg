import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world
    .without("actionState", "unconscious", "dead")
    .with("playerController", "sequenceController");

  return () => {
    for (const entity of entities) {
      console.warn("controller conflict", entity.name, engine.world.id(entity));
      engine.world.removeComponent(entity, "sequenceController");
    }
  };
});
