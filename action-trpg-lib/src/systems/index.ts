import { joinSystems, periodicSystem } from "../System";
import { action } from "./action";
import applyAccumulatedCriticalDamage from "./applyAccumulatedCriticalDamage";
import applyAccumulatedDamage from "./applyAccumulatedDamage";
import cdp from "./cdp";
import contents from "./contents";
import control from "./control";
import damageToCriticalDamage from "./damageToCriticalDamage";
import dead from "./dead";
import ep from "./ep";
import healingTaker from "./healingTaker";
import hp from "./hp";
import { observation } from "./observation";
import { stats } from "./stats";
import { statusEffect } from "./statusEffect";
import unconscious from "./unconscious";

export const bindRootSystem = (actorPeriodMS: number) =>
  joinSystems([
    observation.reset,
    control,
    periodicSystem(
      actorPeriodMS,
      joinSystems([
        statusEffect.poison,
        statusEffect.regeneration,
        statusEffect.advantage,
        statusEffect.guard,
        statusEffect.fortify,
        action.buff,
        action.unequip,
        action.equip,
        stats.equipment,
        stats.status,
        stats.apply,
        action.attack,
        action.drop,
        action.take,
        action.move,
        action.advance,
      ])
    ),
    damageToCriticalDamage,
    healingTaker,
    applyAccumulatedDamage,
    applyAccumulatedCriticalDamage,
    hp,
    ep,
    cdp,
    unconscious,
    dead,
    contents,
    stats.traits,
    stats.equipment,
    stats.status,
    stats.apply,
    observation.proliferate,
  ]);
