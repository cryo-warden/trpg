import { applyStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "attack",
    (effect, entity, target) => {
      const damage = Math.max(
        0,
        effect.damage + (entity.attack ?? 0) - (target.defense ?? 0)
      );
      const criticalDamage = Math.max(
        0,
        effect.criticalDamage - (target.criticalDefense ?? 0)
      );

      if (damage > 0) {
        engine.world.addComponent(target, "accumulatedDamage", 0);
        target.accumulatedDamage = (target.accumulatedDamage ?? 0) + damage;
      }
      if (criticalDamage > 0) {
        engine.world.addComponent(target, "accumulatedCriticalDamage", 0);
        target.accumulatedCriticalDamage =
          (target.accumulatedCriticalDamage ?? 0) + criticalDamage;
      }

      if (target.observable != null) {
        target.observable.push({ type: "damage", damage, entity, target });
      }

      if (effect.statusEffectMap != null) {
        applyStatusEffectMap(engine, target, effect.statusEffectMap);
      }
    }
  );
});
