import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "drop",
    (_dropEffect, entity, target) => {
      if (target.takeable == null) {
        return;
      }

      if (target.location != null) {
        // Trigger update of old location contents.
        engine.world.removeComponent(target.location, "contentsCleanFlag");
      }
      engine.world.addComponent(target, "location", entity.location ?? null);
      target.location = entity.location ?? null;
      if (target.location != null) {
        // Trigger update of new location contents.
        engine.world.removeComponent(target.location, "contentsCleanFlag");
      }
    }
  );
});
