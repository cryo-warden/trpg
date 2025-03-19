import { bindSystems, periodicSystem } from "../System";
import actor from "./actor";
import actorController from "./actorController";
import cdp from "./cdp";
import contents from "./contents";
import criticalDamageTaker from "./criticalDamageTaker";
import damageTaker from "./damageTaker";
import damageToCriticalDamage from "./damageToCriticalDamage";
import ep from "./ep";
import equipmentStatCache from "./equipmentStatCache";
import healingTaker from "./healingTaker";
import hp from "./hp";
import stats from "./stats";
import statusDead from "./statusDead";
import statusUnconscious from "./statusUnconscious";
import traitsStatCache from "./traitsStatCache";

export const bindRootSystem = (actorPeriodMS: number) =>
  bindSystems([
    actorController,
    periodicSystem(actorPeriodMS, actor),
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
    traitsStatCache,
    equipmentStatCache,
    // TODO statusStatCache,
    stats,
  ]);
