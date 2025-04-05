import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "equip",
    (_equipEffect, entity, target) => {
      applyEvent(engine, entity, {
        type: "equip",
        source: entity,
        target,
      });
    }
  );
});
