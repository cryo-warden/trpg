import { createSystem } from "./createSystem";

/** Too much damage at one time will cause some critical damage. */
export default createSystem((engine) => {
  const entities = engine.world.with("accumulatedDamage");
  return () => {
    for (const entity of entities) {
      const criticalDamage = Math.max(
        0,
        Math.floor(
          entity.accumulatedDamage / (entity.criticalDamageThreshold ?? 2)
        ) - (entity.criticalDefense ?? 0)
      );
      if (criticalDamage > 0) {
        engine.world.addComponent(entity, "accumulatedCriticalDamage", 0);
        entity.accumulatedCriticalDamage =
          (entity.accumulatedCriticalDamage ?? 0) + criticalDamage;
      }
    }
  };
});
