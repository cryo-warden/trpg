import { clamp } from "../math/clamp";
import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("hp");
  return () => {
    for (const entity of entities) {
      entity.hp = clamp(entity.hp, 0, entity.mhp ?? Infinity);
    }
  };
};
