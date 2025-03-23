import type { Engine } from "../Engine";
import type { Entity } from "../Entity";
import type { Action } from "./Action";

export type StatBlock = {
  mhp: number;
  mep: number;
  attack: number;
  defense: number;
  actions: Action[];
};

export const applyStatBlock = (
  engine: Engine,
  entity: Entity,
  statBlock: StatBlock
) => {
  if (entity.hp != null && entity.hp > 0 && entity.mhp != null) {
    entity.hp += statBlock.mhp - entity.mhp;
  }
  engine.world.addComponent(entity, "mhp", statBlock.mhp);
  engine.world.addComponent(entity, "hp", statBlock.mhp);
  entity.mhp = statBlock.mhp;

  if (entity.ep != null && entity.ep > 0 && entity.mep != null) {
    entity.ep += statBlock.mep - entity.mep;
  }
  engine.world.addComponent(entity, "mep", statBlock.mep);
  engine.world.addComponent(entity, "ep", statBlock.mep);
  entity.mep = statBlock.mep;

  engine.world.addComponent(entity, "attack", statBlock.attack);
  entity.attack = statBlock.attack;

  engine.world.addComponent(entity, "defense", statBlock.defense);
  entity.defense = statBlock.defense;

  engine.world.addComponent(entity, "actions", statBlock.actions);
  entity.actions = statBlock.actions;
};

export const mergeStatBlock = (target: StatBlock, source: StatBlock): void => {
  target.mhp += source.mhp;
  target.mep += source.mep;
  target.attack += source.attack;
  target.defense += source.defense;
  target.actions = [...new Set([...target.actions, ...source.actions])];
};

export const createStatBlock = (
  customFields: Partial<StatBlock>
): StatBlock => {
  return {
    mhp: customFields.mhp ?? 0,
    mep: customFields.mep ?? 0,
    attack: customFields.attack ?? 0,
    defense: customFields.defense ?? 0,
    actions: customFields.actions ?? [],
  };
};
