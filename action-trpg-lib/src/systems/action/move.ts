import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "move",
    (_moveEffect, entity, target) => {
      if (target.path == null) {
        return;
      }

      if (entity.location != null) {
        // Trigger update of old location contents.
        engine.world.removeComponent(entity.location, "contentsCleanFlag");
      }
      entity.location = target.path.destination;
      // Trigger update of new location contents.
      engine.world.removeComponent(entity.location, "contentsCleanFlag");
    }
  );
});
