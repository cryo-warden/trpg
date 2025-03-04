import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("hp", "damageTaker");
  return () => {
    for (const entity of entities) {
      entity.hp -= entity.damageTaker.accumulatedDamage;
      entity.damageTaker.accumulatedDamage = 0;
    }
  };
};
