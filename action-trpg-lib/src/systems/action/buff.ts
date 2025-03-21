import { applyStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "buff",
    ({ buff }, _entity, target) => {
      switch (buff.type) {
        case "heal":
          if (target.healingTaker != null) {
            target.healingTaker.accumulatedHealing += buff.heal;
          }
          break;
        case "status":
          applyStatusEffectMap(engine, target, buff.statusEffectMap);
          break;
      }
    }
  );
});
