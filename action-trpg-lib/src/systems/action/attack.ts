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

      if (target.damageTaker != null) {
        const damage = Math.max(
          0,
          effect.damage + (entity.attack ?? 0) - (target.defense ?? 0)
        );
        target.damageTaker.accumulatedDamage += damage;
      }

      if (effect.criticalDamage > 0 && target.criticalDamageTaker) {
        const criticalDamage = Math.max(
          0,
          effect.criticalDamage - (target.criticalDefense ?? 0)
        );
        target.criticalDamageTaker.accumulatedCriticalDamage += criticalDamage;
      }

      if (effect.statusEffectMap != null) {
        applyStatusEffectMap(engine, target, effect.statusEffectMap);
      }
    }
  );
});
