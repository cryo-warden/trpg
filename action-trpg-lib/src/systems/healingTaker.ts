import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("hp", "accumulatedHealing");
  return () => {
    for (const entity of entities) {
      entity.hp += entity.accumulatedHealing;
      entity.accumulatedHealing = 0;
    }
  };
});
