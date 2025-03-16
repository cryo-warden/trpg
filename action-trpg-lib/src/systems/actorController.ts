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

      // WIP configure action and targets via Controller component.
      entity.actor.actionState = createActionState(
        Math.random() < 0.5 ? action.doubleStrike : action.recover,
        [entity]
      );
    }
  };
}) satisfies System;
