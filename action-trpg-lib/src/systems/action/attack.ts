import { applyStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "attack",
    (effect, entity, target) => {
      if (target.location !== entity.location) {
        return;
      }

      engine.world.addComponent(target, "accumulatedDamage", 0);
      if (target.accumulatedDamage != null) {
        target.accumulatedDamage += Math.max(
          0,
          effect.damage + (entity.attack ?? 0) - (target.defense ?? 0)
        );
      }

      engine.world.addComponent(target, "accumulatedCriticalDamage", 0);
      if (
        effect.criticalDamage > 0 &&
        target.accumulatedCriticalDamage != null
      ) {
        target.accumulatedCriticalDamage += Math.max(
          0,
          effect.criticalDamage - (target.criticalDefense ?? 0)
        );
      }

      if (effect.statusEffectMap != null) {
        applyStatusEffectMap(engine, target, effect.statusEffectMap);
      }
    }
  );
});
