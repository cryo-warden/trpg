import type { World } from "../World";

/** Too much damage at one time will cause some critical damage. */
export default (world: World) => {
  const entities = world.with("damageTaker", "criticalDamageTaker");
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
};
