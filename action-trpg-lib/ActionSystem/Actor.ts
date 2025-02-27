import type { Item } from "../Item";
import {
  combineStatusEffects,
  statusEffectNames,
  type StatusEffectMap,
} from "./StatusEffectMap";
import type { Action, Buff, Effect } from "./Action";
import { clamp } from "../math/clamp";
import type { Path } from "../World";

type Target = Actor[] | Item[] | Path;

type ActionState = {
  action: Action;
  effectSequenceIndex: number;
  target: Target;
};

type Observation = {
  message: string;
};

type Observer = {
  observations: Observation[];
};

type Observable = {
  observations: Observation[];
};

/** An Actor capable of participating in combat. */
export type Actor = {
  /** Hit Points */
  hp: number;
  /** Maximum Hit Points */
  mhp: number;
  /** Critical Damage Points */
  cdp: number;
  /** Accumulated Damage from a single round */
  accumulatedDamage: number;
  /** Accumulated Critical Damage from a single round */
  accumulatedCriticalDamage: number;
  /** Accumulated Healing from a single round */
  accumulatedHealing: number;
  /** Critical Damage Threshold divides your Accumulated Damage to determine how much critical damage you will take for a round. */
  criticalDamageThreshold: number;
  /** Effort Points */
  ep: number;
  /** Maximum Effort Points */
  mep: number;
  /** Attack added to attack effects */
  attack: number;
  /** Defense subtracted from damage */
  defense: number;
  /** Critical Defense subtracted from critical damage */
  criticalDefense: number;
  /** Status Effect Map */
  status: StatusEffectMap;
  /** Action State */
  actionState: null | ActionState;
  /** Observer */
  observer: null | Observer;
  /** Observable */
  observable: null | Observable;
};

type Attack = {
  /** Damage inflicted by the attack. */
  damage: number;
  /** Critical Damage inflicted inherently by the attack. */
  criticalDamage: number;
  /** Map of status effects applied by the attack. */
  status?: StatusEffectMap;
};

const applyAttack = (actor: Actor, attack: Attack) => {
  const damage = Math.max(0, attack.damage - actor.defense);
  actor.accumulatedDamage += damage;

  const criticalDamage = Math.max(
    0,
    attack.criticalDamage - actor.criticalDefense
  );
  actor.accumulatedCriticalDamage += criticalDamage;

  if (attack.status != null)
    for (let key of statusEffectNames) {
      if (attack.status[key] != null) {
        actor.status[key] =
          actor.status[key] != null
            ? combineStatusEffects[key](actor.status[key], attack.status[key])
            : attack.status[key];
      }
    }
};

const performBuff = (buff: Buff, actor: Actor, target: Target) => {
  switch (buff.type) {
    case "heal":
      if (!Array.isArray(target)) {
        break;
      }
      for (let i = 0; i < target.length; ++i) {
        const healTarget = target[i];
        if (!("mhp" in healTarget)) {
          continue;
        }
        healTarget.hp += buff.heal;
      }
      break;
  }
};

const performEffect = (effect: Effect, actor: Actor, target: Target): void => {
  switch (effect.type) {
    case "rest":
      break;
    case "attack":
      const damage = effect.damage + actor.attack;
      if (!Array.isArray(target)) {
        break;
      }
      for (let i = 0; i < target.length; ++i) {
        // TODO Skip target if it's no longer valid.
        const attackTarget = target[i];
        if (!("mhp" in attackTarget)) {
          continue;
        }
        applyAttack(attackTarget, {
          damage,
          criticalDamage: effect.criticalDamage,
          status: effect.status,
        });
      }
      break;
    case "buff":
      const { buff } = effect;
      performBuff(buff, actor, target);
      break;
    case "move":
      break;
  }
};

const updateActorActionState = (actor: Actor) => {
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

const updateActorAction = (actor: Actor, effectType: Effect["type"]): void => {
  const { actionState } = actor;
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

  performEffect(effect, actor, target);
};

const effectTypePriorities: Effect["type"][] = [
  "buff",
  "attack",
  "move",
  "rest",
];

export const updateActors = (actors: Actor[]) => {
  for (let i = 0; i < effectTypePriorities.length; ++i) {
    const effectType = effectTypePriorities[i];
    for (let i = 0; i < actors.length; ++i) {
      updateActorAction(actors[i], effectType);
    }
  }

  for (let i = 0; i < actors.length; ++i) {
    updateActorActionState(actors[i]);
    enforceActorRules(actors[i]);
  }
};

const baseActor = {
  mhp: 10,
  hp: 10,
  cdp: 0,
  accumulatedDamage: 0,
  accumulatedCriticalDamage: 0,
  accumulatedHealing: 0,
  criticalDamageThreshold: 3,
  mep: 10,
  ep: 10,
  attack: 0,
  defense: 0,
  criticalDefense: 0,
  observer: null,
  observable: null,
  status: {},
  actionState: null,
} as const satisfies Actor;

export const createActorFactory =
  (actor: Partial<Actor>) =>
  (customFields: Partial<Actor>): Actor => {
    return {
      ...baseActor,
      ...actor,
      ...customFields,
      status: {
        ...baseActor.status,
        ...(actor.status ?? {}),
        ...(customFields.status ?? {}),
      },
      actionState:
        baseActor.actionState != null ||
        actor.actionState != null ||
        customFields.actionState != null
          ? ({
              ...(baseActor.actionState ?? {}),
              ...(actor.actionState ?? {}),
              ...(customFields.actionState ?? {}),
            } as ActionState)
          : null,
    };
  };

const enforceActorRules = (actor: Actor) => {
  // Too much damage at one time will cause some critical damage.
  actor.accumulatedCriticalDamage += Math.max(
    0,
    Math.floor(actor.accumulatedDamage / actor.criticalDamageThreshold) -
      actor.criticalDefense
  );

  actor.hp += actor.accumulatedHealing - actor.accumulatedDamage;
  actor.cdp += actor.accumulatedCriticalDamage;

  actor.accumulatedDamage = 0;
  actor.accumulatedHealing = 0;
  actor.accumulatedCriticalDamage = 0;

  actor.hp = clamp(actor.hp, 0, actor.mhp);
  actor.ep = clamp(actor.ep, 0, actor.mep);
  actor.cdp = clamp(actor.cdp, 0, actor.mhp);

  if (actor.hp <= actor.cdp) {
    actor.status.unconscious = true;
  }

  if (actor.cdp >= actor.mhp) {
    actor.status.dead = true;
  }
};

export const createActionState = (
  action: Action,
  target: Target
): ActionState => ({
  action,
  effectSequenceIndex: 0,
  target,
});
