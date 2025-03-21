import { createSystem } from "./createSystem";

/** Too much damage at one time will cause some critical damage. */
export default createSystem((engine) => {
  const entities = engine.world.with("accumulatedDamage");
  return () => {
    for (const entity of entities) {
      if (entity.accumulatedCriticalDamage != null) {
        entity.accumulatedCriticalDamage += Math.max(
          0,
          Math.floor(
            entity.accumulatedDamage / (entity.criticalDamageThreshold ?? 2)
          ) - (entity.criticalDefense ?? 0)
        );
      }
    }
  };
});
