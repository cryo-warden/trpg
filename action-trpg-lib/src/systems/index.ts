import { joinSystems, periodicSystem } from "../System";
import { action } from "./action";
import cdp from "./cdp";
import contents from "./contents";
import control from "./control";
import criticalDamageTaker from "./criticalDamageTaker";
import damageTaker from "./damageTaker";
import damageToCriticalDamage from "./damageToCriticalDamage";
import ep from "./ep";
import equipmentStatBlock from "./equipmentStatBlock";
import healingTaker from "./healingTaker";
import hp from "./hp";
import stats from "./stats";
import statusDead from "./statusDead";
import { statusEffect } from "./statusEffect";
import statusStatBlock from "./statusStatBlock";
import statusUnconscious from "./statusUnconscious";
import traitsStatBlock from "./traitsStatBlock";

export const bindRootSystem = (actorPeriodMS: number) =>
  joinSystems([
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
        statusStatBlock,
        stats,
        action.attack,
        action.move,
        action.advance,
      ])
    ),
    damageToCriticalDamage,
    healingTaker,
    damageTaker,
    criticalDamageTaker,
    hp,
    ep,
    cdp,
    statusUnconscious,
    statusDead,
    contents,
    traitsStatBlock,
    equipmentStatBlock,
    statusStatBlock,
    stats,
  ]);
