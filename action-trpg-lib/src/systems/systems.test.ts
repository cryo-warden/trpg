import { expect, describe, test } from "bun:test";
import { createActionState } from "../structures/ActionState";
import { buffEffect, effect } from "../structures/Effect";
import type { Action } from "../structures/Action";
import { createEntityFactory, type Entity } from "../Entity";
import { createEngine, type Engine } from "../Engine";
import { bindRootSystem } from ".";

const createEntity = createEntityFactory({
  name: "test entity",
  mhp: 10,
  hp: 10,
  cdp: 0,
  damageTaker: {
    accumulatedDamage: 0,
    criticalDamageThreshold: 3,
  },
  criticalDamageTaker: {
    accumulatedCriticalDamage: 0,
  },
  healingTaker: { accumulatedHealing: 0 },
  ep: 10,
  mep: 10,
  status: {},
  actor: { actionState: null },
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
  gainAdvantage: {
    effectSequence: [
      effect.normalRest,
      buffEffect.normalStatus({ advantage: { attack: 1, duration: 1 } }),
      effect.extremeRest,
    ],
  },
} as const satisfies Record<string, Action>;

// TODO buffs, then attacks, then movement
// Actions must resolve in that order when happening in the same tick.
// The current strategy of simply looping over all actors and applying their actions in order is not viable. The realization of an effect must be separated from the application of its effect. The realized effects can then be placed into a priority queue, to resolve in the intended order.

const createRootSystemTest = (periodMS = 1000) => {
  const engine = createEngine();
  const rootSystem = bindRootSystem(periodMS)(engine);

  const iterate = () => {
    engine.time += periodMS;
    rootSystem();
  };

  const addEntity = <const T extends Partial<Entity>>(
    customFields: Partial<T>
  ): ReturnType<typeof createEntity<T>> => {
    const entity = createEntity(customFields);
    engine.world.add(entity);
    return entity;
  };

  return { iterate, addEntity };
};

describe("systems", () => {
  describe("actor system", () => {
    test("can progress through an action and remove a completed action", () => {
      const { iterate, addEntity } = createRootSystemTest();
      const { actor } = addEntity({});

      actor.actionState = createActionState(action.comboStrike, []);

      const assertCase = (index: number | null) => {
        if (index == null) {
          expect(actor.actionState).toBeNull();
        } else {
          expect(actor.actionState?.effectSequenceIndex).toBe(index);
        }
        iterate();
      };

      assertCase(0);
      assertCase(1);
      assertCase(2);
      assertCase(3);
      assertCase(null);
      assertCase(null);
    });

    test("can deal damage and heal", () => {
      const { iterate, addEntity } = createRootSystemTest();
      const target = addEntity({
        mhp: 10,
        hp: 10,
        damageTaker: {
          accumulatedDamage: 0,
          criticalDamageThreshold: 3,
        },
      });
      const aggressor = addEntity({});

      target.actor.actionState = createActionState(action.luckyHeal, [target]);
      aggressor.actor.actionState = createActionState(action.comboStrike, [
        target,
      ]);

      const assertCase = (index: number | null, hp: number, cdp: number) => {
        if (index == null) {
          expect(aggressor.actor.actionState).toBeNull();
        } else {
          expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(index);
        }
        expect(target.hp).toBe(hp);
        expect(target.cdp).toBe(cdp);
        iterate();
      };

      assertCase(0, 10, 0);
      assertCase(1, 10, 0);
      assertCase(2, 9, 0);
      assertCase(3, 7, 0);
      assertCase(null, 4, 1);
      assertCase(null, 10, 1);
    });

    test("can cause poison, which causes damage after a delay then wears off", () => {
      const { iterate, addEntity } = createRootSystemTest();
      const target = addEntity({
        mhp: 10,
        hp: 10,
        damageTaker: {
          accumulatedDamage: 0,
          criticalDamageThreshold: 3,
        },
      });
      const aggressor = addEntity({});

      aggressor.actor.actionState = createActionState(
        {
          effectSequence: [
            effect.normalStatusAttack({
              poison: {
                damage: 1,
                delay: 2,
                duration: 2,
              },
            }),
            effect.normalStatusAttack({
              poison: {
                damage: 0,
                delay: 0,
                duration: 3,
              },
            }),
          ],
        },
        [target]
      );

      const assertCase = (index: number | null, hp: number, cdp: number) => {
        if (index == null) {
          expect(aggressor.actor.actionState).toBeNull();
        } else {
          expect(aggressor.actor.actionState?.effectSequenceIndex).toBe(index);
        }
        expect(target.hp).toBe(hp);
        expect(target.cdp).toBe(cdp);
        iterate();
      };

      assertCase(0, 10, 0);
      assertCase(1, 10, 0);
      expect(target.status.poison).toEqual({
        damage: 1,
        delay: 0,
        duration: 5,
      });
      assertCase(null, 10, 0);
      assertCase(null, 9, 0);
      assertCase(null, 8, 0);
      assertCase(null, 7, 0);
      assertCase(null, 6, 0);
      assertCase(null, 5, 0);
      assertCase(null, 5, 0);
      assertCase(null, 5, 0);
    });
  });
});
