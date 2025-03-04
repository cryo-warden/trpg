import type { System } from "../System";

/** Too much damage at one time will cause some critical damage. */
export default ((engine) => {
  const entities = engine.world.with("damageTaker", "criticalDamageTaker");
  return () => {
    for (const entity of entities) {
      entity.criticalDamageTaker.accumulatedCriticalDamage += Math.max(
        0,
        Math.floor(
          entity.damageTaker.accumulatedDamage /
            entity.damageTaker.criticalDamageThreshold
        ) - entity.criticalDamageTaker.criticalDefense
      );
    }
  };
}) satisfies System;
