import type { Entity } from "../../Entity";
import { validateEffect, type Effect } from "../../structures/Effect";
import type { Engine } from "../../Engine";
import type { Resource } from "../../structures/Resource";
import type { ActionRecord } from "../../structures/Action";

export const createActionEffectSystem = <
  const TResource extends Resource<TResource, TActionRecord>,
  const TActionRecord extends ActionRecord<TResource>,
  const TType extends Effect<TResource>["type"]
>(
  engine: Engine<TResource>,
  effectType: TType,
  apply: (
    effect: Extract<Effect<TResource>, { type: TType }>,
    entity: Entity<TResource>,
    target: Entity<TResource>
  ) => void
): (() => void) => {
  const entities = engine.world
    .with("actionState")
    .without("unconscious", "dead");

  return () => {
    for (const entity of entities) {
      const {
        actionState: { effectSequenceIndex, action, targets },
      } = entity;

      const effect =
        engine.resource.actionRecord[action].effectSequence[
          effectSequenceIndex
        ];
      if (effect.type === effectType) {
        for (let i = 0; i < targets.length; ++i) {
          const target = targets[i];
          if (!validateEffect(effect, entity, target)) {
            continue;
          }
          apply(
            effect as Extract<Effect<TResource>, { type: TType }>,
            entity,
            target
          );
        }
      }
    }
  };
};
