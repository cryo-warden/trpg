import { validateActionTarget } from "../../Resource";
import { createActionState } from "../../structures/ActionState";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world
    .without("actionState", "unconscious", "dead")
    .with("sequenceController");

  return () => {
    for (const entity of entities) {
      if (entity.actions == null) {
        continue;
      }
      const actions = entity.actions;
      if (actions.length < 1) {
        continue;
      }
      if (entity.sequenceController.sequenceIndex >= actions.length) {
        entity.sequenceController.sequenceIndex = 0;
      }
      const action = actions[entity.sequenceController.sequenceIndex];
      entity.sequenceController.sequenceIndex += 1;
      const target = (
        entity.location?.contents == null ? [entity] : entity.location.contents
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
    }
  };
});
