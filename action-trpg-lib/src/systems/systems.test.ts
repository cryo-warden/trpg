import { expect, describe, test } from "bun:test";
import { createActionState } from "../structures/ActionState";
import { buffEffect, effect } from "../structures/Effect";
import type { Action } from "../structures/Action";
import { createEntityFactory } from "../Entity";
import { createEngine, type Engine } from "../Engine";
import { bindRootSystem } from ".";

const createEntity = createEntityFactory({
  mhp: 10,
  hp: 10,
  cdp: 0,
  damageTaker: {
    defense: 0,
    accumulatedDamage: 0,
    criticalDamageThreshold: 3,
  },
  criticalDamageTaker: {
    criticalDefense: 0,
    accumulatedCriticalDamage: 0,
  },
  healingTaker: { accumulatedHealing: 0 },
  ep: 10,
  mep: 10,
  status: {},
  actor: { attack: 0, actionState: null },
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
    const engine = createEngine();
    const entity = createEntity({});
    engine.world.add(entity);
    const rootSystem = bindRootSystem(engine);

    const { actor } = entity;
    actor.actionState = createActionState(action.comboStrike, []);

    expect(actor.actionState?.effectSequenceIndex).toBe(0);

    rootSystem();
    expect(actor.actionState?.effectSequenceIndex).toBe(1);

    rootSystem();
    expect(actor.actionState?.effectSequenceIndex).toBe(2);

    rootSystem();
    expect(actor.actionState?.effectSequenceIndex).toBe(3);

    rootSystem();
    expect(actor.actionState).toBeNull();

    rootSystem();
    expect(actor.actionState).toBeNull();
  });

  test("can deal damage and heal", () => {
    const target = createEntity({
      mhp: 10,
      hp: 10,
      damageTaker: {
        accumulatedDamage: 0,
        criticalDamageThreshold: 3,
        defense: 0,
      },
    });
    const aggressor = createEntity({});
    const engine = createEngine();
    engine.world.add(aggressor);
    engine.world.add(target);
    const rootSystem = bindRootSystem(engine);

    target.actor.actionState = createActionState(action.luckyHeal, [target]);
    aggressor.actor.actionState = createActionState(action.comboStrike, [
      target,
    ]);

    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(0);
    expect(target.hp).toBe(10);

    rootSystem();
    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(1);
    expect(target.hp).toBe(10);
    expect(target.cdp).toBe(0);

    rootSystem();
    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(2);
    expect(target.hp).toBe(9);
    expect(target.cdp).toBe(0);

    rootSystem();
    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(3);
    expect(target.hp).toBe(7);
    expect(target.cdp).toBe(0);

    rootSystem();
    expect(aggressor.actor.actionState).toBeNull();
    expect(target.hp).toBe(4);
    expect(target.cdp).toBe(1);

    rootSystem();
    expect(aggressor.actor.actionState).toBeNull();
    expect(target.hp).toBe(10);
    expect(target.cdp).toBe(1);
  });
});
