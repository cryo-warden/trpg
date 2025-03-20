import type { Engine } from "../Engine";
import type { Entity } from "../Entity";

export type StatBlock = {
  mhp: number;
  mep: number;
  attack: number;
  defense: number;
};

export const applyStatBlock = (
  engine: Engine,
  entity: Entity,
  baseline: StatBlock
) => {
  if (entity.hp != null && entity.mhp != null) {
    entity.hp += baseline.mhp - entity.mhp;
  }
  engine.world.addComponent(entity, "mhp", baseline.mhp);
  engine.world.addComponent(entity, "hp", baseline.mhp);
  entity.mhp = baseline.mhp;

  if (entity.ep != null && entity.mep != null) {
    entity.ep += baseline.mep - entity.mep;
  }
  engine.world.addComponent(entity, "mep", baseline.mep);
  engine.world.addComponent(entity, "ep", baseline.mep);
  entity.mep = baseline.mep;

  engine.world.addComponent(entity, "attack", baseline.attack);
  entity.attack = baseline.attack;

  engine.world.addComponent(entity, "defense", baseline.defense);
  entity.defense = baseline.defense;
};

export const mergeStatBlock = (target: StatBlock, source: StatBlock): void => {
  target.mhp += source.mhp;
  target.mep += source.mep;
  target.attack += source.attack;
  target.defense += source.defense;
};

export const createStatBlock = (
  customFields: Partial<StatBlock>
): StatBlock => {
  return {
    mhp: customFields.mhp ?? 0,
    mep: customFields.mep ?? 0,
    attack: customFields.attack ?? 0,
    defense: customFields.defense ?? 0,
  };
};
