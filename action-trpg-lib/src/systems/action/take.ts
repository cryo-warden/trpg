import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";
import { createActionEffectSystem } from "./createActionEffectSystem";

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "take",
    (_takeEffect, entity, target) => {
      applyEvent(engine, {
        type: "take",
        source: entity,
        target,
      });
    }
  );
});
