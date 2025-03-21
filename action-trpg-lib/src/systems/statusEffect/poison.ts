import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("poison");
  return () => {
    for (const entity of entities) {
      if (entity.poison.delay > 0) {
        entity.poison.delay -= 1;
      } else {
        if (entity.damageTaker != null) {
          entity.damageTaker.accumulatedDamage += entity.poison.damage;
        }
        entity.poison.duration -= 1;
        if (entity.poison.duration <= 0) {
          engine.world.removeComponent(entity, "poison");
        }
      }
    }
  };
});
