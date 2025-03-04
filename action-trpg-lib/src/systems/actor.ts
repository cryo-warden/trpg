import { hasComponents, type Entity } from "../Entity";
import type { Attack } from "../structures/Attack";
import type { Buff, Effect } from "../structures/Effect";
import {
  combineStatusEffects,
  statusEffectNames,
} from "../structures/StatusEffectMap";
import type { Target } from "../structures/Target";
import type { System } from "../System";

const applyAttack = (entity: Entity, attack: Attack) => {
  if (!hasComponents(entity, ["damageTaker"])) {
    return;
  }

  const damage = Math.max(0, attack.damage - entity.damageTaker.defense);
  entity.damageTaker.accumulatedDamage += damage;

  if (!hasComponents(entity, ["criticalDamageTaker"])) {
    return;
  }
  const criticalDamage = Math.max(
    0,
    attack.criticalDamage - entity.criticalDamageTaker.criticalDefense
  );
  entity.criticalDamageTaker.accumulatedCriticalDamage += criticalDamage;

  if (attack.status == null || !hasComponents(entity, ["status"])) {
    return;
  }

  for (let key of statusEffectNames) {
    if (attack.status[key] != null) {
      entity.status[key] =
        entity.status[key] != null
          ? combineStatusEffects[key](entity.status[key], attack.status[key])
          : attack.status[key];
    }
  }
};

const performBuff = (buff: Buff, entity: Entity, target: Target) => {
  switch (buff.type) {
    case "heal":
      if (!Array.isArray(target)) {
        break;
      }
      for (let i = 0; i < target.length; ++i) {
        const healTarget = target[i];
        if (!hasComponents(healTarget, ["healingTaker"])) {
          continue;
        }
        healTarget.healingTaker.accumulatedHealing += buff.heal;
      }
      break;
  }
};

const performEffect = (
  effect: Effect,
  entity: Entity,
  target: Target
): void => {
  switch (effect.type) {
    case "rest":
      break;
    case "attack":
      const damage = effect.damage + (entity.actor?.attack ?? 0);
      if (!Array.isArray(target)) {
        break;
      }
      for (let i = 0; i < target.length; ++i) {
        // TODO Skip target if it's no longer valid due to different location.
        applyAttack(target[i], {
          damage,
          criticalDamage: effect.criticalDamage,
          status: effect.status,
        });
      }
      break;
    case "buff":
      const { buff } = effect;
      performBuff(buff, entity, target);
      break;
    case "move":
      break;
  }
};

const effectTypePriorities: Effect["type"][] = [
  "buff",
  "attack",
  "move",
  "rest",
];

export default ((engine) => {
  const entities = engine.world.with("actor");
  return () => {
    for (const effectType of effectTypePriorities) {
      for (const entity of entities) {
        const { actionState } = entity.actor;
        if (actionState == null) {
          continue;
        }

        const {
          effectSequenceIndex,
          action: { effectSequence },
          target,
        } = actionState;

        const effect = effectSequence[effectSequenceIndex];
        if (effect == null || effect.type !== effectType) {
          continue;
        }

        performEffect(effect, entity, target);
      }
    }

    for (const { actor } of entities) {
      const { actionState } = actor;
      if (actionState == null) {
        continue;
      }

      actionState.effectSequenceIndex += 1;
      if (
        actionState.effectSequenceIndex >=
        actionState.action.effectSequence.length
      ) {
        actor.actionState = null;
      }
    }
  };
}) satisfies System;
