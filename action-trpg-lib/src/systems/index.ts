import { bindSystems, periodicSystem } from "../System";
import actor from "./actor";
import actorController from "./actorController";
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

export const bindRootSystem = (actorPeriodMS: number) =>
  bindSystems([
    actorController,
    periodicSystem(actorPeriodMS, actor),
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
