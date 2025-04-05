import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "drop",
    (_dropEffect, entity, target) => {
      if (target.location != null) {
        // Trigger update of old location contents.
        engine.world.removeComponent(target.location, "contentsCleanFlag");
      }
      const newLocation = entity.location ?? entity;
      engine.world.addComponent(target, "location", newLocation);
      target.location = newLocation;
      // Trigger update of new location contents.
      engine.world.removeComponent(newLocation, "contentsCleanFlag");
    }
  );
});
