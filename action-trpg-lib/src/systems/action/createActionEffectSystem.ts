import type { Entity } from "../../Entity";
import { validateEffect, type Effect } from "../../structures/Effect";
import type { Engine } from "../../Engine";

export const createActionEffectSystem = <const TType extends Effect["type"]>(
  engine: Engine,
  effectType: TType,
  apply: (
    effect: Extract<Effect, { type: TType }>,
    entity: Entity,
    target: Entity
  ) => void
): (() => void) => {
  const entities = engine.world
    .with("actionState")
    .without("unconscious", "dead");

  return () => {
    for (const entity of entities) {
      const {
        actionState: {
          effectSequenceIndex,
          action: { effectSequence },
          targets,
        },
      } = entity;

      const effect = effectSequence[effectSequenceIndex];
      if (effect.type === effectType) {
        for (let i = 0; i < targets.length; ++i) {
          const target = targets[i];
          if (!validateEffect(effect, entity, target)) {
            continue;
          }
          apply(effect as Extract<Effect, { type: TType }>, entity, target);
        }
      }
    }
  };
};
