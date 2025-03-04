import { clamp } from "../math/clamp";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("ep");
  return () => {
    for (const entity of entities) {
      entity.ep = clamp(entity.ep, 0, entity.mep ?? Infinity);
    }
  };
}) satisfies System;
