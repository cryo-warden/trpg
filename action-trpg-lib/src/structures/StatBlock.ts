import type { Engine } from "../Engine";
import type { Entity } from "../Entity";
import type { ActionRecord } from "./Action";

export type StatBlock = {
  mhp: number;
  mep: number;
  attack: number;
  defense: number;
  actionRecord: ActionRecord;
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

  engine.world.addComponent(entity, "actionRecord", statBlock.actionRecord);
  entity.actionRecord = statBlock.actionRecord;
};

export const mergeStatBlock = (target: StatBlock, source: StatBlock): void => {
  target.mhp += source.mhp;
  target.mep += source.mep;
  target.attack += source.attack;
  target.defense += source.defense;
  target.actionRecord = {
    ...target.actionRecord,
    ...source.actionRecord,
  };
};

export const createStatBlock = (
  customFields: Partial<StatBlock>
): StatBlock => {
  return {
    mhp: customFields.mhp ?? 0,
    mep: customFields.mep ?? 0,
    attack: customFields.attack ?? 0,
    defense: customFields.defense ?? 0,
    actionRecord:
      (customFields.actionRecord && { ...customFields.actionRecord }) ?? {},
  };
};

export type Baseline = { name: string; statBlock: StatBlock };

export const createBaseline = <
  const TName extends string,
  const TStatBlock extends StatBlock
>(
  name: TName,
  customFields: Partial<TStatBlock>
) => ({
  name,
  statBlock: createStatBlock(customFields),
});

export type BaselineRecord<TBaselines extends Baseline[] = Baseline[]> = {
  [name in TBaselines[number]["name"]]: Extract<
    TBaselines[number],
    { name: name }
  >;
};

export const createBaselineRecord = <const T extends Baseline[]>(
  baselines: T
): BaselineRecord<T> =>
  baselines.reduce((result, baseline) => {
    result[baseline.name] = baseline;
    return result;
  }, {} as any);

// May not always be the same as Baseline. Do not combine these.
export type Trait = { name: string; statBlock: StatBlock };

export const createTrait = <const TName extends string>(
  name: TName,
  customFields: Partial<StatBlock>
) => ({
  name,
  statBlock: createStatBlock(customFields),
});

export type TraitRecord<TTraits extends Trait[] = Trait[]> = {
  [name in TTraits[number]["name"]]: Extract<TTraits[number], { name: name }>;
};

export const createTraitRecord = <const T extends Trait[]>(
  traits: T
): TraitRecord<T> =>
  traits.reduce((result, trait) => {
    result[trait.name] = trait;
    return result;
  }, {} as any);
