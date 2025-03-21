import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("actionState");

  return () => {
    for (const entity of entities) {
      const { actionState } = entity;

      actionState.effectSequenceIndex += 1;
      if (
        actionState.effectSequenceIndex >=
        actionState.action.effectSequence.length
      ) {
        engine.world.removeComponent(entity, "actionState");
      }
    }
  };
});
