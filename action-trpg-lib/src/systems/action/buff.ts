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
              type: "heal",
              heal: buff.heal,
              entity,
              target,
            });
          }
          break;
        case "status":
          applyStatusEffectMap(engine, target, buff.statusEffectMap);
          if (target.observable != null) {
            target.observable.push({
              type: "status",
              statusEffectMap: buff.statusEffectMap,
              entity,
              target,
            });
          }
          break;
      }
    }
  );
});
