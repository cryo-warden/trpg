import { joinSystems, periodicSystem } from "../System";
import cdp from "./cdp";
import contents from "./contents";
import criticalDamageTaker from "./criticalDamageTaker";
import damageTaker from "./damageTaker";
import damageToCriticalDamage from "./damageToCriticalDamage";
import ep from "./ep";
import equipmentStatBlock from "./equipmentStatBlock";
import healingTaker from "./healingTaker";
import hp from "./hp";
import stats from "./stats";
import statusDead from "./statusDead";
import statusEffect from "./statusEffect";
import statusStatBlock from "./statusStatBlock";
import statusUnconscious from "./statusUnconscious";
import traitsStatBlock from "./traitsStatBlock";
import control from "./control";
import { action } from "./action";

export const bindRootSystem = (actorPeriodMS: number) =>
  joinSystems([
    control,
    periodicSystem(
      actorPeriodMS,
      joinSystems([
        action.buff,
        statusStatBlock,
        stats,
        action.attack,
        action.move,
        action.advance,
      ])
    ),
    periodicSystem(actorPeriodMS, statusEffect),
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
