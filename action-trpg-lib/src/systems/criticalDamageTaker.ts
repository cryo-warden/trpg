import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("cdp", "criticalDamageTaker");
  return () => {
    for (const entity of entities) {
      entity.cdp += entity.criticalDamageTaker.accumulatedCriticalDamage;
      entity.criticalDamageTaker.accumulatedCriticalDamage = 0;
    }
  };
};
