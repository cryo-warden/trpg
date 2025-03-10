import type { Action } from "../structures/Action";
import { createActionState } from "../structures/ActionState";
import { buffEffect, effect } from "../structures/Effect";
import type { System } from "../System";

const action = {
  comboStrike: {
    effectSequence: [
      effect.normalRest,
      effect.normalAttack(1),
      effect.powerfulAttack(2),
      effect.extremeAttack(3),
    ],
  },
  luckyHeal: {
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      effect.normalRest,
      buffEffect.extremeHeal(7),
    ],
  },
  ultimateNap: {
    effectSequence: [
      effect.normalRest,
      effect.normalRest,
      effect.powerfulRest,
      effect.extremeRest,
    ],
  },
} as const satisfies Record<string, Action>;

export default ((engine) => {
  const entities = engine.world.with("actor", "controller");
  return () => {
    for (const entity of entities) {
      if (entity.actor.actionState != null) {
        continue;
      }

      // WIP configure action and targets via Controller component.
      entity.actor.actionState = createActionState(action.luckyHeal, [entity]);
    }
  };
}) satisfies System;
