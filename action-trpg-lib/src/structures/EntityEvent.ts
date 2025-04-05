import type { Engine } from "../Engine";
import type { Entity } from "../Entity";
import type { Action } from "./Action";
import { type StatusEffectMap } from "./StatusEffectMap";

export type EntityEvent =
  | {
      type: "action";
      action: Action;
      source: Entity;
      target: Entity;
    }
  | {
      type: "damage";
      damage: number;
      criticalDamage: number;
      source: Entity;
      target: Entity;
    }
  | {
      type: "heal";
      heal: number;
      source: Entity;
      target: Entity;
    }
  | {
      type: "status";
      statusEffectMap: StatusEffectMap;
      source: Entity;
      target: Entity;
    }
  | {
      type: "unconscious";
      source: Entity;
    }
  | {
      type: "dead";
      source: Entity;
    };

export const applyEvent = (
  engine: Engine,
  entity: Entity,
  event: EntityEvent
) => {
  if (entity.events != null) {
    entity.events.push(event);
  } else {
    engine.world.addComponent(entity, "events", [event]);
  }
};
