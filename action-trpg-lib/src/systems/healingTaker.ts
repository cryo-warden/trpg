import { createSystem } from "../System";

export default createSystem((engine) => {
  const entities = engine.world.with("hp", "healingTaker");
  return () => {
    for (const entity of entities) {
      entity.hp += entity.healingTaker.accumulatedHealing;
      entity.healingTaker.accumulatedHealing = 0;
    }
  };
});
