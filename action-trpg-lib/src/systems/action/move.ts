import type { Entity } from "../../Entity";
import type { Buff, Effect, MoveEffect } from "../../structures/Effect";
import { mergeStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../../System";
import { createActionEffectSystem } from "./createActionEffectSystem";

const effectTypePriorities: Effect["type"][] = [
  // "equip",
  // TODO Resolve equip stat changes because
  // "buff",
  // TODO Resolve equip and buff stat changes.
  // TODO Refactor because other systems must run between these. Keep applying them on the same phase of each period though, to allow them to interact via temporary other component states.
  // "attack",
  // TODO Resolve debuff stat changes.
  // "move",
  // "rest",
] as const;

export default createSystem((engine) => {
  return createActionEffectSystem(
    engine,
    "move",
    (_moveEffect, entity, target) => {
      if (target.path == null) {
        return;
      }

      if (entity.location != null) {
        // Trigger update of old location contents.
        engine.world.removeComponent(entity.location, "contentsCleanFlag");
      }
      entity.location = target.path.destination;
      // Trigger update of new location contents.
      engine.world.removeComponent(entity.location, "contentsCleanFlag");
    }
  );
});
