import { action } from "../../prototypeData";
import { createActionState } from "../structures/ActionState";
import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("controller").without("actionState");
  return () => {
    for (const entity of entities) {
      switch (entity.controller.type) {
        case "player":
          const nextAction = entity.controller.actionQueue.shift();
          if (nextAction == null) {
            break;
          }
          engine.world.addComponent(
            entity,
            "actionState",
            createActionState(nextAction.action, nextAction.targets)
          );
          break;
        case "sequence":
          // WIP configure action and targets via Controller component.
          // engine.world.addComponent(
          //   entity,
          //   "actionState",
          //   createActionState(
          //     Math.random() < 0.5 ? action.doubleStrike : action.recover,
          //     [entity]
          //   )
          // );
          break;
      }
    }
  };
}) satisfies System;
