import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("cdp", "criticalDamageTaker");
  return () => {
    for (const entity of entities) {
      entity.cdp += entity.criticalDamageTaker.accumulatedCriticalDamage;
      entity.criticalDamageTaker.accumulatedCriticalDamage = 0;
    }
  };
}) satisfies System;
