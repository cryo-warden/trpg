import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "take",
    (_takeEffect, entity, target) => {
      if (target.location != null) {
        // Trigger update of old location contents.
        engine.world.removeComponent(target.location, "contentsCleanFlag");
      }
      engine.world.addComponent(target, "location", entity);
      target.location = entity;
      // Trigger update of new location contents.
      engine.world.removeComponent(target.location, "contentsCleanFlag");
    }
  );
});
