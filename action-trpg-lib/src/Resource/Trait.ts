import type { Resource, ResourceTraitRecord } from ".";
import { type StatBlock, createStatBlock } from "../structures/StatBlock";

// May not always be the same as Baseline. Do not combine them.

export type Trait<TResource extends Resource<TResource>> = {
  name: string;
  statBlock: StatBlock<TResource>;
};

export const createTrait = <
  const TResource extends Resource<TResource>,
  const TName extends string
>(
  name: TName,
  customFields: Partial<StatBlock<TResource>>
) => ({
  name,
  statBlock: createStatBlock(customFields),
});

export type TraitRecord<
  TResource extends Resource<TResource>,
  TTraits extends Trait<TResource>[] = Trait<TResource>[]
> = {
  [name in TTraits[number]["name"]]: Extract<TTraits[number], { name: name }>;
};

export const createTraitRecord = <
  const TResource extends Resource<TResource>,
  const T extends Trait<TResource>[]
>(
  traits: T
): TraitRecord<TResource, T> =>
  traits.reduce((result, trait) => {
    result[trait.name] = trait;
    return result;
  }, {} as any);

export type ResourceTraitName<TResource extends Resource<TResource>> = string &
  keyof ResourceTraitRecord<TResource>;
