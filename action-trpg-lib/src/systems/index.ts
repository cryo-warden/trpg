import { joinSystems, periodicSystem } from "../System";
import { action } from "./action";
import applyAccumulatedCriticalDamage from "./applyAccumulatedCriticalDamage";
import applyAccumulatedDamage from "./applyAccumulatedDamage";
import cdp from "./cdp";
import contents from "./contents";
import { control } from "./control";
import damageToCriticalDamage from "./damageToCriticalDamage";
import dead from "./dead";
import ep from "./ep";
import { event } from "./event";
import healingTaker from "./healingTaker";
import hp from "./hp";
import { stats } from "./stats";
import { statusEffect } from "./statusEffect";
import unconscious from "./unconscious";

export const bindRootSystem = (actorPeriodMS: number) =>
  joinSystems([
    event.resetObservers,
    control.validate,
    control.playerControl,
    control.sequenceControl,
    periodicSystem(
      actorPeriodMS,
      joinSystems([
        statusEffect.poison,
        statusEffect.regeneration,
        statusEffect.advantage,
        statusEffect.guard,
        statusEffect.fortify,
        action.begin,
        action.buff,
        action.unequip,
        action.equip,
        event.resolve,
        stats.equipment,
        stats.status,
        stats.apply,
        event.resolve,
        action.attack,
        action.drop,
        action.take,
        action.move,
        action.advance,
        event.resolve,
      ])
    ),
    damageToCriticalDamage,
    healingTaker,
    applyAccumulatedDamage,
    applyAccumulatedCriticalDamage,
    hp,
    ep,
    cdp,
    event.resolve,
    unconscious,
    dead,
    contents,
    stats.traits,
    stats.equipment,
    stats.status,
    stats.apply,
    event.resolve,
    event.observation,
  ]);
