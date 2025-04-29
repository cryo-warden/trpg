import { applyEvent } from "../../structures/EntityEvent";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("actionState");

  return () => {
    for (const entity of entities) {
      const { actionState } = entity;

      if (actionState.effectSequenceIndex === 0) {
        applyEvent(engine, {
          type: "action",
          action: actionState.action,
          source: entity,
          target: actionState.targets[0] ?? entity,
        });
      }
    }
  };
});
