// import { action } from "../../prototypeData";
import { validateActionTarget } from "../structures/Action";
import { createActionState } from "../structures/ActionState";
import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world
    .with("controller")
    .without("actionState", "unconscious", "dead");
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
          if (entity.actions == null || entity.actions.length < 1) {
            continue;
          }
          if (entity.controller.sequenceIndex >= entity.actions.length) {
            entity.controller.sequenceIndex = 0;
          }
          const action = entity.actions[entity.controller.sequenceIndex];
          entity.controller.sequenceIndex += 1;
          const target = (
            entity.location?.contents == null
              ? [entity]
              : entity.location.contents
          )
            .toSorted(() => Math.random() - 0.5)
            .find((t) => validateActionTarget(action, entity, t));

          if (target == null) {
            continue;
          }

          engine.world.addComponent(
            entity,
            "actionState",
            createActionState(action, [target])
          );
          break;
      }
    }
  };
});
