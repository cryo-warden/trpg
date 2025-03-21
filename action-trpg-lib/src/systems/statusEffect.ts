import type { System } from "../System";

export default ((engine) => {
  const entities = engine.world.with("status");
  return () => {
    for (const entity of entities) {
      if (entity.status.advantage != null) {
        entity.status.advantage.duration -= 1;
        if (entity.status.advantage.duration <= 0) {
          delete entity.status.advantage;
          engine.world.removeComponent(entity, "statusStatBlockCleanFlag");
        }
      }
      if (entity.status.guard != null) {
        entity.status.guard.duration -= 1;
        if (entity.status.guard.duration <= 0) {
          delete entity.status.guard;
          engine.world.removeComponent(entity, "statusStatBlockCleanFlag");
        }
      }
      if (entity.status.fortify != null) {
        entity.status.fortify.duration -= 1;
        if (entity.status.fortify.duration <= 0) {
          delete entity.status.fortify;
          engine.world.removeComponent(entity, "statusStatBlockCleanFlag");
        }
      }
      if (entity.status.poison != null) {
        if (entity.status.poison.delay > 0) {
          entity.status.poison.delay -= 1;
        } else {
          if (entity.damageTaker != null) {
            entity.damageTaker.accumulatedDamage += entity.status.poison.damage;
          }
          entity.status.poison.duration -= 1;
          if (entity.status.poison.duration <= 0) {
            delete entity.status.poison;
          }
        }
      }
    }
  };
}) satisfies System;
