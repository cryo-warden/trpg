import type { Engine } from "../Engine";
import type { Entity } from "../Entity";
import type { Resource, ResourceActionName } from "./Resource";
import type { StatBlock } from "./StatBlock";
import { type StatusEffectMap } from "./StatusEffectMap";

export type EntityEvent<TResource extends Resource<TResource>> =
  | {
      type: "action";
      action: ResourceActionName<TResource>;
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "damage";
      damage: number;
      criticalDamage: number;
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "dead";
      source: Entity<TResource>;
    }
  | {
      type: "drop";
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "equip";
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "heal";
      heal: number;
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "move";
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "stats";
      statBlock: StatBlock<TResource>;
      source: Entity<TResource>;
    }
  | {
      type: "status";
      statusEffectMap: StatusEffectMap<TResource>;
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "take";
      source: Entity<TResource>;
      target: Entity<TResource>;
    }
  | {
      type: "unconscious";
      source: Entity<TResource>;
    }
  | {
      type: "unequip";
      source: Entity<TResource>;
      target: Entity<TResource>;
    };

export type EngineEntityEvent<TEngine> = TEngine extends Engine<infer TResource>
  ? EntityEvent<TResource>
  : never;

export const applyEvent = <const TResource extends Resource<TResource>>(
  engine: Engine<TResource>,
  entity: Entity<TResource>,
  event: EntityEvent<TResource>
) => {
  if (entity.events != null) {
    entity.events.push(event);
  } else {
    engine.world.addComponent(entity, "events", [event]);
  }
};
