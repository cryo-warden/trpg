import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("hp", "healingTaker");
  return () => {
    for (const entity of entities) {
      entity.hp += entity.healingTaker.accumulatedHealing;
      entity.healingTaker.accumulatedHealing = 0;
    }
  };
};
