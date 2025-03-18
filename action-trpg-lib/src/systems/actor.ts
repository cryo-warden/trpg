import type { Entity } from "../Entity";
import type {
  AttackEffect,
  Buff,
  Effect,
  MoveEffect,
} from "../structures/Effect";
import {
  combineStatusEffects,
  statusEffectNames,
} from "../structures/StatusEffectMap";
import type { System } from "../System";

const effectTypePriorities: Effect["type"][] = [
  "equip",
  "buff",
  "attack",
  "move",
  "rest",
] as const;

export default ((engine) => {
  const entities = engine.world.with("actor");

  const applyAttack = (
    effect: AttackEffect,
    entity: Entity,
    target: Entity
  ) => {
    if (target.location !== entity.location) {
      return;
    }

    if (target.damageTaker != null) {
      const damage = Math.max(
        0,
        effect.damage + (entity.attack ?? 0) - (target.defense ?? 0)
      );
      target.damageTaker.accumulatedDamage += damage;
    }

    if (effect.criticalDamage > 0 && target.criticalDamageTaker) {
      const criticalDamage = Math.max(
        0,
        effect.criticalDamage - (target.criticalDefense ?? 0)
      );
      target.criticalDamageTaker.accumulatedCriticalDamage += criticalDamage;
    }

    if (effect.status != null && target.status != null) {
      for (let key of statusEffectNames) {
        if (effect.status[key] != null) {
          target.status[key] =
            target.status[key] != null
              ? combineStatusEffects[key](
                  target.status[key],
                  effect.status[key]
                )
              : effect.status[key];
        }
      }
    }
  };

  const performBuff = (buff: Buff, _entity: Entity, target: Entity) => {
    switch (buff.type) {
      case "heal":
        if (target.healingTaker != null) {
          target.healingTaker.accumulatedHealing += buff.heal;
        }
        break;
    }
  };

  const performMove = (
    _moveEffect: MoveEffect,
    entity: Entity,
    target: Entity
  ) => {
    if (target.path == null) {
      return;
    }

    if (entity.location != null) {
      // Trigger update of old location contents.
      engine.world.removeComponent(entity.location, "contentsCleanFlag");
    }
    entity.location = target.path.destination;
    // Trigger update of new location contents.
    engine.world.removeComponent(entity.location, "contentsCleanFlag");
  };

  const performEffect = (
    effect: Effect,
    entity: Entity,
    targets: Entity[]
  ): void => {
    for (let i = 0; i < targets.length; ++i) {
      const target = targets[i];
      switch (effect.type) {
        case "rest":
          break;
        case "attack":
          applyAttack(effect, entity, target);
          break;
        case "buff":
          performBuff(effect.buff, entity, target);
          break;
        case "move":
          performMove(effect, entity, target);
          break;
      }
    }
  };

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
          targets,
        } = actionState;

        const effect = effectSequence[effectSequenceIndex];
        if (effect != null && effect.type === effectType) {
          performEffect(effect, entity, targets);
        }
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
