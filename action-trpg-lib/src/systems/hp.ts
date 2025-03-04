import { clamp } from "../math/clamp";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("hp");
  return () => {
    for (const entity of entities) {
      entity.hp = clamp(entity.hp, 0, entity.mhp ?? Infinity);
    }
  };
}) satisfies System;
