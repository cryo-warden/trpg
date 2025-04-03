import type { Entity } from "../Entity";
import type { Action } from "./Action";
import type { StatusEffectMap } from "./StatusEffectMap";

export type Observation =
  | {
      type: "action";
      action: Action;
      entity: Entity;
      target: Entity;
    }
  | {
      type: "damage";
      damage: number;
      entity: Entity;
      target: Entity;
    }
  | {
      type: "heal";
      heal: number;
      entity: Entity;
      target: Entity;
    }
  | {
      type: "status";
      statusEffectMap: StatusEffectMap;
      entity: Entity;
      target: Entity;
    }
  | {
      type: "unconscious";
      entity: Entity;
    }
  | {
      type: "dead";
      entity: Entity;
    };
