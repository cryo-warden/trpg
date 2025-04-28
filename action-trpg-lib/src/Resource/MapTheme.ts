import type {
  Resource,
  ResourceMapThemeRecord,
  ResourcePrefabEntityName,
} from ".";

export type MapTheme<TResource extends Resource<TResource>> = {
  name: string;
  decorationPrefabNames: ResourcePrefabEntityName<TResource>[];
};

export const createMapTheme = <
  const TResource extends Resource<TResource>,
  const TName extends string
>(
  name: TName,
  decorationPrefabNames: ResourcePrefabEntityName<TResource>[]
) =>
  ({
    name,
    decorationPrefabNames,
  } satisfies MapTheme<TResource>);

export type MapThemeRecord<
  TResource extends Resource<TResource>,
  TMapThemes extends MapTheme<TResource>[] = MapTheme<TResource>[]
> = {
  [name in TMapThemes[number]["name"]]: Extract<
    TMapThemes[number],
    { name: name }
  >;
};

export const createMapThemeRecord = <
  const TResource extends Resource<TResource>,
  const T extends MapTheme<TResource>[]
>(
  mapThemes: T
): MapThemeRecord<TResource> =>
  mapThemes.reduce((result, mapTheme) => {
    result[mapTheme.name] = mapTheme;
    return result;
  }, {} as any);

export type ResourceMapThemeName<TResource extends Resource<TResource>> =
  string & keyof ResourceMapThemeRecord<TResource>;
