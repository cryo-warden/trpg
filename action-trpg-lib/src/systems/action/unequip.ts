import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "unequip",
    (_unequipEffect, entity, target) => {
      applyEvent(engine, entity, {
        type: "unequip",
        source: entity,
        target,
      });
    }
  );
});
