import { World } from "miniplex";
import { Entity } from "../entity";
import { System } from ".";
import { Clock } from "../resource";
import { direct } from "../vector";

export const createActionSystem = (
  world: World<Entity>,
  clock: Clock
): System => {
  const actingEntities = world.with("actor");

  return () => {
    for (const entity of actingEntities) {
      const { actor } = entity;
      if (actor.timeOfNextAction <= clock.now && actor.actionQueue.length > 0) {
        const action = actor.actionQueue.shift()!;
        switch (action.type) {
          case "move":
            if (entity.velocity != null && entity.position != null) {
              // TODO Allow custom scaling and direction with a mover component.
              direct(entity.velocity, entity.position, action.destination, 1);
            }
            break;
        }
        actor.timeOfNextAction += 3;
      }
    }
  };
};
