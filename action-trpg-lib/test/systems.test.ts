import { describe, expect, test } from "bun:test";
import { createEngine } from "../src/Engine";
import {
  createEntityFactory,
  type EngineEntity,
  type Entity,
} from "../src/Entity";
import { buffEffect, effect, type EngineResource } from "../src/Resource";
import { createActionState } from "../src/structures/ActionState";
import { bindRootSystem } from "../src/systems";

// TODO buffs, then attacks, then movement
// Actions must resolve in that order when happening in the same tick.
// The current strategy of simply looping over all actors and applying their actions in order is not viable. The realization of an effect must be separated from the application of its effect. The realized effects can then be placed into a priority queue, to resolve in the intended order.

const createRootSystemTest = (periodMS = 1000) => {
  const engine = createEngine({
    actionRecord: {
      testPoison: {
        name: "testPoison",
        renderer: null,
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
      comboStrike: {
        name: "Test Combo Strike",
        renderer: null,
        effectSequence: [
          effect.normalRest,
          effect.normalAttack(1),
          effect.powerfulAttack(2),
          effect.extremeAttack(3),
        ],
      },
      luckyHeal: {
        name: "Test Lucky Heal",
        renderer: null,
        effectSequence: [
          effect.normalRest,
          effect.normalRest,
          effect.normalRest,
          effect.normalRest,
          buffEffect.extremeHeal(7),
        ],
      },
      ultimateNap: {
        name: "Test Ultimate Nap",
        renderer: null,
        effectSequence: [
          effect.normalRest,
          effect.normalRest,
          effect.powerfulRest,
          effect.extremeRest,
        ],
      },
      gainAdvantage: {
        name: "Test Gain Advantage",
        renderer: null,
        effectSequence: [
          effect.normalRest,
          buffEffect.normalStatus({ advantage: { attack: 1, duration: 1 } }),
          effect.extremeRest,
        ],
      },
    },
    baselineRecord: {},
    traitRecord: {},
  });
  type TestEngine = typeof engine;
  type TestResource = EngineResource<TestEngine>;
  type TestEntity = EngineEntity<TestEngine>;
  const rootSystem = bindRootSystem(periodMS)(engine);
  const createEntity = createEntityFactory(engine, {
    name: "test entity",
    mhp: 10,
    hp: 10,
    cdp: 0,
    criticalDamageThreshold: 3,
    ep: 10,
    mep: 10,
    status: {},
  });

  const iterate = () => {
    engine.time += periodMS;
    rootSystem();
  };

  const addEntity = (customFields: Partial<TestEntity>): TestEntity => {
    const entity = createEntity(customFields);
    engine.world.add(entity);
    return entity;
  };

  const addComponent = <TName extends keyof TestEntity>(
    entity: TestEntity,
    name: TName,
    value: TestEntity[TName]
  ) => {
    engine.world.addComponent(entity, name, value);
  };

  const boundCreateActionState = (
    action: keyof TestResource["actionRecord"],
    targets: TestEntity[]
  ) => createActionState(engine, action, targets);

  return {
    iterate,
    addEntity,
    addComponent,
    createActionState: boundCreateActionState,
  };
};

describe("systems", () => {
  describe("actor system", () => {
    test("can progress through an action and remove a completed action", () => {
      const { iterate, addEntity, createActionState } = createRootSystemTest();
      const entity = addEntity({});

      entity.actionState = createActionState("comboStrike", []);

      const assertCase = (index: number | null) => {
        if (index == null) {
          expect(entity.actionState).toBeUndefined();
        } else {
          expect(entity.actionState?.effectSequenceIndex).toBe(index);
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
      const { iterate, addEntity, addComponent, createActionState } =
        createRootSystemTest();
      const target = addEntity({
        name: "target",
        mhp: 10,
        hp: 10,
        criticalDamageThreshold: 3,
      });
      const aggressor = addEntity({ name: "aggressor" });

      addComponent(
        target,
        "actionState",
        createActionState("luckyHeal", [target])
      );
      addComponent(
        aggressor,
        "actionState",
        createActionState("comboStrike", [target])
      );

      const assertCase = (index: number | null, hp: number, cdp: number) => {
        if (index == null) {
          expect(aggressor.actionState).toBeUndefined();
        } else {
          expect(aggressor.actionState?.effectSequenceIndex).toBe(index);
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
      const { iterate, addEntity, createActionState } = createRootSystemTest();
      const target = addEntity({
        name: "target",
        mhp: 10,
        hp: 10,
        criticalDamageThreshold: 3,
      });
      const aggressor = addEntity({ name: "aggressor" });

      aggressor.actionState = createActionState("testPoison", [target]);

      const assertCase = (index: number | null, hp: number, cdp: number) => {
        if (index == null) {
          expect(aggressor.actionState).toBeUndefined();
        } else {
          expect(aggressor.actionState?.effectSequenceIndex).toBe(index);
        }
        expect(target.hp).toBe(hp);
        expect(target.cdp).toBe(cdp);
        iterate();
      };

      assertCase(0, 10, 0);
      assertCase(1, 10, 0);
      expect(target.poison).toEqual({
        damage: 1,
        delay: 1,
        duration: 5,
      });
      assertCase(null, 10, 0);
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
