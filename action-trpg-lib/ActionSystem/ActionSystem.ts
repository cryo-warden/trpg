import {
  combineStatusEffects,
  statusEffectNames,
} from "../structures/StatusEffectMap";
import type { Buff, Effect } from "../structures/Effect";
import { clamp } from "../math/clamp";
import type { Attack } from "../structures/Attack";
import type { Target } from "../structures/Target";
import { hasComponents, type Entity } from "../Entity";

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

const updateActorActionState = (entity: Entity) => {
  if (!hasComponents(entity, ["actor"])) {
    return;
  }
  const { actor } = entity;
  const { actionState } = actor;
  if (actionState == null) {
    return;
  }

  actionState.effectSequenceIndex += 1;
  if (
    actionState.effectSequenceIndex >= actionState.action.effectSequence.length
  ) {
    actor.actionState = null;
  }
};

const updateActorAction = (
  entity: Entity,
  effectType: Effect["type"]
): void => {
  if (!hasComponents(entity, ["actor"])) {
    return;
  }
  const { actionState } = entity.actor;
  if (actionState == null) {
    return;
  }

  const {
    effectSequenceIndex,
    action: { effectSequence },
    target,
  } = actionState;

  const effect = effectSequence[effectSequenceIndex];
  if (effect == null || effect.type !== effectType) {
    return;
  }

  performEffect(effect, entity, target);
};

const effectTypePriorities: Effect["type"][] = [
  "buff",
  "attack",
  "move",
  "rest",
];

export const actionSystem = (entities: Entity[]) => {
  for (let i = 0; i < effectTypePriorities.length; ++i) {
    const effectType = effectTypePriorities[i];
    for (let i = 0; i < entities.length; ++i) {
      updateActorAction(entities[i], effectType);
    }
  }

  for (let i = 0; i < entities.length; ++i) {
    updateActorActionState(entities[i]);
    enforceVariousComponentRules(entities[i]);
  }
};

const enforceVariousComponentRules = (entity: Entity) => {
  // Too much damage at one time will cause some critical damage.
  if (hasComponents(entity, ["damageTaker", "criticalDamageTaker"])) {
    entity.criticalDamageTaker.accumulatedCriticalDamage += Math.max(
      0,
      Math.floor(
        entity.damageTaker.accumulatedDamage /
          entity.damageTaker.criticalDamageThreshold
      ) - entity.criticalDamageTaker.criticalDefense
    );
  }

  if (hasComponents(entity, ["hp"])) {
    if (hasComponents(entity, ["healingTaker"])) {
      entity.hp += entity.healingTaker.accumulatedHealing;
      entity.healingTaker.accumulatedHealing = 0;
    }
    if (hasComponents(entity, ["damageTaker"])) {
      entity.hp -= entity.damageTaker.accumulatedDamage;
      entity.damageTaker.accumulatedDamage = 0;
    }

    entity.hp = clamp(entity.hp, 0, entity.mhp ?? Infinity);
  }

  if (hasComponents(entity, ["cdp", "criticalDamageTaker"])) {
    entity.cdp += entity.criticalDamageTaker.accumulatedCriticalDamage;
    entity.criticalDamageTaker.accumulatedCriticalDamage = 0;
  }

  if (hasComponents(entity, ["ep"])) {
    entity.ep = clamp(entity.ep, 0, entity.mep ?? Infinity);
  }
  if (hasComponents(entity, ["cdp"])) {
    entity.cdp = clamp(entity.cdp, 0, entity.mhp ?? Infinity);
  }

  if (hasComponents(entity, ["status"])) {
    if (hasComponents(entity, ["hp"])) {
      if (entity.hp <= (entity.cdp ?? 0)) {
        entity.status.unconscious = true;
      }

      if (hasComponents(entity, ["cdp"])) {
        if (entity.cdp >= (entity.mhp ?? Infinity)) {
          entity.status.dead = true;
        }
      }
    }
  }
};
