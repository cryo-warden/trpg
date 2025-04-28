import type { Resource, ResourceBaselineRecord } from ".";
import { type StatBlock, createStatBlock } from "../structures/StatBlock";

export type Baseline<TResource extends Resource<TResource>> = {
  name: string;
  statBlock: StatBlock<TResource>;
};

export const createBaseline = <
  const TResource extends Resource<TResource>,
  const TName extends string,
  const TStatBlock extends StatBlock<TResource>
>(
  name: TName,
  customFields: Partial<TStatBlock>
) => ({
  name,
  statBlock: createStatBlock(customFields),
});

export type BaselineRecord<
  TResource extends Resource<TResource>,
  TBaselines extends Baseline<TResource>[] = Baseline<TResource>[]
> = {
  [name in TBaselines[number]["name"]]: Extract<
    TBaselines[number],
    { name: name }
  >;
};

export const createBaselineRecord = <
  const TResource extends Resource<TResource>,
  const T extends Baseline<TResource>[]
>(
  baselines: T
): BaselineRecord<TResource, T> =>
  baselines.reduce((result, baseline) => {
    result[baseline.name] = baseline;
    return result;
  }, {} as any);

export type ResourceBaselineName<TResource extends Resource<TResource>> =
  string & keyof ResourceBaselineRecord<TResource>;
