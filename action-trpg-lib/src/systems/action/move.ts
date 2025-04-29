import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "move",
    (_moveEffect, entity, target) => {
      applyEvent(engine, {
        type: "move",
        source: entity,
        target,
      });
    }
  );
});
