import type { Engine } from "../Engine";
import type { ActionRecord } from "./Action";
import type { TraitRecord } from "./Trait";
import type { BaselineRecord } from "./Baseline";
import type { MapThemeRecord } from "./MapTheme";
import type { PrefabEntityRecord } from "./PrefabEntity";

// TODO Get rid of all this "Resource" complication and just use entities to structure each type of data. This facilitates making live updates and will enable in-game content creation.
// TODO For entities which must be looked up by name regularly, have a system place them into a name-lookup registry on the engine. Maybe make names optional to facilitate this.
// TODO Replace name-based rendering with a more sophisticated rendering strategy. Given that rendering can't rely on knowing in advance everything that could appear in the game, maybe go ahead and allow language-specific entity-embedded text values to be rendered. It's the only way content can be created in-game. Clearly mark rendering values so that they can be translated more easily. Grammar rules may need to be configurable. Or maybe grammar can still be contained to a hard-coded layer. Don't worry about it for now.

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
