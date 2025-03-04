import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("hp", "damageTaker");
  return () => {
    for (const entity of entities) {
      entity.hp -= entity.damageTaker.accumulatedDamage;
      entity.damageTaker.accumulatedDamage = 0;
    }
  };
}) satisfies System;
