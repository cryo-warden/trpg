import { applyStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "buff",
    ({ buff }, entity, target) => {
      switch (buff.type) {
        case "heal":
          engine.world.addComponent(target, "accumulatedHealing", 0);
          if (target.accumulatedHealing != null) {
            target.accumulatedHealing += buff.heal;
          }
          if (target.observable != null) {
            target.observable.push({
              message: `${entity.name} healed ${target.name} for ${buff.heal}!`,
            });
          }
          break;
        case "status":
          applyStatusEffectMap(engine, target, buff.statusEffectMap);
          if (target.observable != null) {
            target.observable.push({
              message: `${entity.name} applied ${Object.keys(
                buff.statusEffectMap
              )
                .sort()
                .join(", ")} to ${target.name}!`,
            });
          }
          break;
      }
    }
  );
});
