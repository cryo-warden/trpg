import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("hp", "accumulatedDamage");
  return () => {
    for (const entity of entities) {
      entity.hp -= entity.accumulatedDamage;
      entity.accumulatedDamage = 0;
    }
  };
});
