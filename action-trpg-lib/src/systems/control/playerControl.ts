import { createActionState } from "../../structures/ActionState";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world
    .without("actionState", "unconscious", "dead")
    .with("playerController");

  return () => {
    for (const entity of entities) {
      const nextAction = entity.playerController.actionQueue.shift();
      if (nextAction != null) {
        engine.world.addComponent(
          entity,
          "actionState",
          createActionState(engine, nextAction.action, nextAction.targets)
        );
      }
    }
  };
});
