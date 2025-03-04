import { clamp } from "../math/clamp";
import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("cdp");
  return () => {
    for (const entity of entities) {
      entity.cdp = clamp(entity.cdp, 0, entity.mhp ?? Infinity);
    }
  };
};
