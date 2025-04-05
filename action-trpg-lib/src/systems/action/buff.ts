import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "buff",
    ({ buff }, entity, target) => {
      switch (buff.type) {
        case "heal":
          applyEvent(engine, entity, {
            type: "heal",
            heal: buff.heal,
            source: entity,
            target,
          });
          break;
        case "status":
          applyEvent(engine, entity, {
            type: "status",
            statusEffectMap: buff.statusEffectMap,
            source: entity,
            target,
          });
          break;
      }
    }
  );
});
