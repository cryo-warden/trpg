import type { Engine } from "../Engine";
import type { ActionRecord } from "./Action";
import type { TraitRecord } from "./Trait";
import type { BaselineRecord } from "./Baseline";
import type { MapThemeRecord } from "./MapTheme";
import type { PrefabEntityRecord } from "./PrefabEntity";

export type Resource<
  TResource extends Resource<
    TResource,
    TActionRecord,
    TBaselineRecord,
    TMapThemeRecord,
    TPrefabEntityRecord,
    TTraitRecord
  >,
  TActionRecord extends ActionRecord<TResource> = ActionRecord<TResource>,
  TBaselineRecord extends BaselineRecord<TResource> = BaselineRecord<TResource>,
  TMapThemeRecord extends MapThemeRecord<TResource> = MapThemeRecord<TResource>,
  TPrefabEntityRecord extends PrefabEntityRecord<TResource> = PrefabEntityRecord<TResource>,
  TTraitRecord extends TraitRecord<TResource> = TraitRecord<TResource>
> = {
  actionRecord: TActionRecord;
  baselineRecord: TBaselineRecord;
  mapThemeRecord: TMapThemeRecord;
  prefabEntityRecord: TPrefabEntityRecord;
  traitRecord: TTraitRecord;
};

export type ResourceActionRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, infer TActionRecord> ? TActionRecord : never;

export type ResourceBaselineRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, any, infer TBaselineRecord>
    ? TBaselineRecord
    : never;

export type ResourceMapThemeRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, any, any, infer TMapThemeRecord>
    ? TMapThemeRecord
    : never;

export type ResourcePrefabEntityRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, any, any, any, infer TPrefabEntityRecord>
    ? TPrefabEntityRecord
    : never;

export type ResourceTraitRecord<TResource extends Resource<TResource>> =
  TResource extends Resource<any, any, any, any, any, infer TTraitRecord>
    ? TTraitRecord
    : never;

export type EngineResource<TEngine> = TEngine extends Engine<infer TResource>
  ? TResource
  : never;

export * from "./Action";
export * from "./Baseline";
export * from "./MapTheme";
export * from "./PrefabEntity";
export * from "./Trait";
