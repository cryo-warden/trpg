import { action } from "../structures/prototypeAction";
import { createActionState } from "../structures/ActionState";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("actor", "controller");
  return () => {
    for (const entity of entities) {
      if (entity.actor.actionState != null) {
        continue;
      }

      switch (entity.controller.type) {
        case "player":
          const nextAction = entity.controller.actionQueue.shift();
          if (nextAction == null) {
            break;
          }
          entity.actor.actionState = createActionState(
            nextAction.action,
            nextAction.targets
          );
          break;
        case "sequence":
          // WIP configure action and targets via Controller component.
          // entity.actor.actionState = createActionState(
          //   Math.random() < 0.5 ? action.doubleStrike : action.recover,
          //   [entity]
          // );
          break;
      }
    }
  };
}) satisfies System;
