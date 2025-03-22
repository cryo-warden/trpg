import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("cdp", "accumulatedCriticalDamage");
  return () => {
    for (const entity of entities) {
      entity.cdp += entity.accumulatedCriticalDamage;
      entity.accumulatedCriticalDamage = 0;
    }
  };
});
