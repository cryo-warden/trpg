import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "attack",
    (effect, entity, target) => {
      applyEvent(engine, {
        type: "damage",
        damage: Math.max(
          0,
          effect.damage + (entity.attack ?? 0) - (target.defense ?? 0)
        ),
        criticalDamage: Math.max(
          0,
          effect.criticalDamage - (target.criticalDefense ?? 0)
        ),
        source: entity,
        target,
      });

      if (effect.statusEffectMap != null) {
        applyEvent(engine, {
          type: "status",
          statusEffectMap: effect.statusEffectMap,
          source: entity,
          target,
        });
      }
    }
  );
});
