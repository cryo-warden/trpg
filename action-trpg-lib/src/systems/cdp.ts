import { clamp } from "../math/clamp";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("cdp");
  return () => {
    for (const entity of entities) {
      entity.cdp = clamp(entity.cdp, 0, entity.mhp ?? Infinity);
    }
  };
});
