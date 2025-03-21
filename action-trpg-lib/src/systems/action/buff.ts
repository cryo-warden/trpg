import { mergeStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../../System";
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
          if (target.status != null) {
            mergeStatusEffectMap(target.status, buff.statusEffectMap);
            engine.world.removeComponent(target, "statusStatBlockCleanFlag");
          }
      }
    }
  );
});
