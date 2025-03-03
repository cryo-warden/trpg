import { expect, describe, test } from "bun:test";
import { actionSystem } from "./ActionSystem";
import { createActionState } from "../structures/Action";
import { buffEffect, effect } from "../structures/Action";
import type { Action } from "../structures/Action";
import { createEntityFactory, mergeEntity, type Entity } from "../Entity";

const createEntity = createEntityFactory({
  hpTracker: { mhp: 10, hp: 10 },
  cdpTracker: { cdp: 0 },
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
  epTracker: { mep: 10, ep: 10 },
  statusTracker: { status: {} },
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
    const entity = createEntity({});
    const entities = [entity];

    const { actor } = entity;
    actor.actionState = createActionState(action.comboStrike, []);

    expect(actor.actionState?.effectSequenceIndex).toBe(0);

    actionSystem(entities);
    expect(actor.actionState?.effectSequenceIndex).toBe(1);

    actionSystem(entities);
    expect(actor.actionState?.effectSequenceIndex).toBe(2);

    actionSystem(entities);
    expect(actor.actionState?.effectSequenceIndex).toBe(3);

    actionSystem(entities);
    expect(actor.actionState).toBeNull();

    actionSystem(entities);
    expect(actor.actionState).toBeNull();
  });

  test("can deal damage and heal", () => {
    const target = createEntity({
      hpTracker: { mhp: 10, hp: 10 },
      damageTaker: {
        accumulatedDamage: 0,
        criticalDamageThreshold: 3,
        defense: 0,
      },
    });
    const aggressor = createEntity({ attack: 0 });
    const entities = [target, aggressor];

    target.actor.actionState = createActionState(action.luckyHeal, [target]);
    aggressor.actor.actionState = createActionState(action.comboStrike, [
      target,
    ]);

    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(0);
    expect(target.hpTracker.hp).toBe(10);

    actionSystem(entities);
    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(1);
    expect(target.hpTracker.hp).toBe(10);
    expect(target.cdpTracker.cdp).toBe(0);

    actionSystem(entities);
    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(2);
    expect(target.hpTracker.hp).toBe(9);
    expect(target.cdpTracker.cdp).toBe(0);

    actionSystem(entities);
    expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(3);
    expect(target.hpTracker.hp).toBe(7);
    expect(target.cdpTracker.cdp).toBe(0);

    actionSystem(entities);
    expect(aggressor.actor.actionState).toBeNull();
    expect(target.hpTracker.hp).toBe(4);
    expect(target.cdpTracker.cdp).toBe(1);

    actionSystem(entities);
    expect(aggressor.actor.actionState).toBeNull();
    expect(target.hpTracker.hp).toBe(10);
    expect(target.cdpTracker.cdp).toBe(1);
  });
});
