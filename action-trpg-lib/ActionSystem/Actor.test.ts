import { expect, describe, test } from "bun:test";
import { createActionState, createActorFactory, updateActors } from "./Actor";
import { buffEffect, effect } from "./Action";
import type { Action } from "./Action";

const createActor = createActorFactory({
  mhp: 10,
  hp: 10,
  cdp: 0,
  mep: 10,
  ep: 10,
  attack: 0,
  defense: 0,
  observer: null,
  observable: null,
  status: {},
  actionState: null,
});

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

// TODO buffs, then attacks, then movement
// Actions must resolve in that order when happening in the same tick.
// The current strategy of simply looping over all actors and applying their actions in order is not viable. The realization of an effect must be separated from the application of its effect. The realized effects can then be placed into a priority queue, to resolve in the intended order.

describe("Actor", () => {
  test("can progress through an action and remove a completed action", () => {
    const actor = createActor({});
    const actors = [actor];

    actor.actionState = createActionState(action.comboStrike, []);

    expect(actor.actionState?.effectSequenceIndex).toBe(0);

    updateActors(actors);
    expect(actor.actionState?.effectSequenceIndex).toBe(1);

    updateActors(actors);
    expect(actor.actionState?.effectSequenceIndex).toBe(2);

    updateActors(actors);
    expect(actor.actionState?.effectSequenceIndex).toBe(3);

    updateActors(actors);
    expect(actor.actionState).toBeNull();

    updateActors(actors);
    expect(actor.actionState).toBeNull();
  });

  test("can deal damage and heal", () => {
    const target = createActor({
      mhp: 10,
      hp: 10,
      criticalDamageThreshold: 3,
      defense: 0,
    });
    const actor = createActor({ attack: 0 });
    const actors = [target, actor];

    target.actionState = createActionState(action.luckyHeal, [target]);
    actor.actionState = createActionState(action.comboStrike, [target]);

    expect(actor.actionState?.effectSequenceIndex).toBe(0);
    expect(target.hp).toBe(10);

    updateActors(actors);
    expect(actor.actionState?.effectSequenceIndex).toBe(1);
    expect(target.hp).toBe(10);
    expect(target.cdp).toBe(0);

    updateActors(actors);
    expect(actor.actionState?.effectSequenceIndex).toBe(2);
    expect(target.hp).toBe(9);
    expect(target.cdp).toBe(0);

    updateActors(actors);
    expect(actor.actionState?.effectSequenceIndex).toBe(3);
    expect(target.hp).toBe(7);
    expect(target.cdp).toBe(0);

    updateActors(actors);
    expect(actor.actionState).toBeNull();
    expect(target.hp).toBe(4);
    expect(target.cdp).toBe(1);

    updateActors(actors);
    expect(actor.actionState).toBeNull();
    expect(target.hp).toBe(10);
    expect(target.cdp).toBe(1);
  });
});
