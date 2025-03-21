import { clamp } from "../math/clamp";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("hp");
  return () => {
    for (const entity of entities) {
      entity.hp = clamp(entity.hp, 0, entity.mhp ?? Infinity);
    }
  };
});
