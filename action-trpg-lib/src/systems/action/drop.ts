import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "drop",
    (_dropEffect, entity, target) => {
      applyEvent(engine, entity, {
        type: "drop",
        source: entity,
        target,
      });
    }
  );
});
