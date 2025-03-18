import type { Engine } from "../Engine";
import { bindSystems, periodicSystem } from "../System";
import actor from "./actor";
import actorController from "./actorController";
import cdp from "./cdp";
import contents from "./contents";
import criticalDamageTaker from "./criticalDamageTaker";
import damageTaker from "./damageTaker";
import damageToCriticalDamage from "./damageToCriticalDamage";
import ep from "./ep";
import healingTaker from "./healingTaker";
import hp from "./hp";
import statusDead from "./statusDead";
import statusUnconscious from "./statusUnconscious";

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
  ]);
