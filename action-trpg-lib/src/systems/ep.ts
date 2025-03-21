import { clamp } from "../math/clamp";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("ep");
  return () => {
    for (const entity of entities) {
      entity.ep = clamp(entity.ep, 0, entity.mep ?? Infinity);
    }
  };
});
