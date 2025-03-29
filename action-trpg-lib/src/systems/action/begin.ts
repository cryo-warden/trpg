import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("actionState", "observable");

  return () => {
    for (const entity of entities) {
      const { actionState, observable } = entity;

      if (actionState.effectSequenceIndex === 0) {
        observable.push({
          type: "action",
          action: actionState.action,
          entity,
          target: actionState.targets[0],
        });
      }
    }
  };
});
