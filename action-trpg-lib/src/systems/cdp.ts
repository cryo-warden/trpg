import { clamp } from "../math/clamp";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("cdp");
  return () => {
    for (const entity of entities) {
      entity.cdp = clamp(entity.cdp, 0, entity.mhp ?? Infinity);
    }
  };
}) satisfies System;
