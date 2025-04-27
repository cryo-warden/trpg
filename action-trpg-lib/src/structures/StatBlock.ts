import type { Engine } from "../Engine";
import type { Entity } from "../Entity";
import type { Resource, ResourceActionName } from "../Resource";

export type StatBlock<TResource extends Resource<TResource>> = {
  mhp: number;
  mep: number;
  attack: number;
  defense: number;
  actionSet: Set<ResourceActionName<TResource>>;
};

export const applyStatBlock = <const TResource extends Resource<TResource>>(
  engine: Engine<TResource>,
  entity: Entity<TResource>,
  statBlock: StatBlock<TResource>
) => {
  if (entity.hp != null && entity.hp > 0 && entity.mhp != null) {
    entity.hp += statBlock.mhp - entity.mhp;
  }
  engine.world.addComponent(entity, "mhp", statBlock.mhp);
  entity.mhp = statBlock.mhp;
  engine.world.addComponent(entity, "hp", statBlock.mhp);

  if (entity.ep != null && entity.ep > 0 && entity.mep != null) {
    entity.ep += statBlock.mep - entity.mep;
  }
  engine.world.addComponent(entity, "mep", statBlock.mep);
  entity.mep = statBlock.mep;
  engine.world.addComponent(entity, "ep", statBlock.mep);

  engine.world.addComponent(entity, "attack", statBlock.attack);
  entity.attack = statBlock.attack;

  engine.world.addComponent(entity, "defense", statBlock.defense);
  entity.defense = statBlock.defense;

  const actions = Array.from(statBlock.actionSet);
  engine.world.addComponent(entity, "actions", actions);
  entity.actions = actions;
};

export const mergeStatBlock = <const TResource extends Resource<TResource>>(
  target: StatBlock<TResource>,
  source: StatBlock<TResource>
): void => {
  target.mhp += source.mhp;
  target.mep += source.mep;
  target.attack += source.attack;
  target.defense += source.defense;
  target.actionSet = target.actionSet.union(source.actionSet);
};

export const createStatBlock = <const TResource extends Resource<TResource>>(
  customFields: Partial<StatBlock<TResource>>
): StatBlock<TResource> => {
  return {
    mhp: customFields.mhp ?? 0,
    mep: customFields.mep ?? 0,
    attack: customFields.attack ?? 0,
    defense: customFields.defense ?? 0,
    actionSet: new Set(customFields.actionSet),
  };
};
