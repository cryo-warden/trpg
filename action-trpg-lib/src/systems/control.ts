import { validateActionTarget } from "../Resource";
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
            createActionState(engine, nextAction.action, nextAction.targets)
          );
          break;
        case "sequence":
          if (entity.actions == null) {
            continue;
          }
          const actions = entity.actions;
          if (actions.length < 1) {
            continue;
          }
          if (entity.controller.sequenceIndex >= actions.length) {
            entity.controller.sequenceIndex = 0;
          }
          const action = actions[entity.controller.sequenceIndex];
          entity.controller.sequenceIndex += 1;
          const target = (
            entity.location?.contents == null
              ? [entity]
              : entity.location.contents
          )
            .toSorted(() => Math.random() - 0.5)
            .find((t) => validateActionTarget(engine, action, entity, t));

          if (target == null) {
            continue;
          }

          engine.world.addComponent(
            entity,
            "actionState",
            createActionState(engine, action, [target])
          );
          break;
      }
    }
  };
});
