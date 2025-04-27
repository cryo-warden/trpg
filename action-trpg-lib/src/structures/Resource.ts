import type { Engine } from "../Engine";
import type { ActionRecord } from "./Action";
import type { BaselineRecord, TraitRecord } from "./StatBlock";

export type Resource<
  TResource extends Resource<
    TResource,
    TActionRecord,
    TBaselineRecord,
    TTraitRecord
  >,
  TActionRecord extends ActionRecord<TResource> = ActionRecord<TResource>,
  TBaselineRecord extends BaselineRecord<TResource> = BaselineRecord<TResource>,
  TTraitRecord extends TraitRecord<TResource> = TraitRecord<TResource>
> = {
  actionRecord: TActionRecord;
  baselineRecord: TBaselineRecord;
  traitRecord: TTraitRecord;
};

export type ResourceActionRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, infer TActionRecord> ? TActionRecord : never;

export type ResourceBaselineRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, any, infer TBaselineRecord>
    ? TBaselineRecord
    : never;

export type ResourceTraitRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, any, any, infer TTraitRecord>
    ? TTraitRecord
    : never;

export type ResourceActionName<TResource extends Resource<TResource>> = string &
  keyof ResourceActionRecord<TResource>;

export type ResourceBaselineName<TResource extends Resource<TResource>> =
  string & keyof ResourceBaselineRecord<TResource>;

export type ResourceTraitName<TResource extends Resource<TResource>> = string &
  keyof ResourceTraitRecord<TResource>;

export type EngineResource<TEngine> = TEngine extends Engine<infer TResource>
  ? TResource
  : never;
