import { clamp } from "../math/clamp";
import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("ep");
  return () => {
    for (const entity of entities) {
      entity.ep = clamp(entity.ep, 0, entity.mep ?? Infinity);
    }
  };
};
