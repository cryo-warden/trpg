import type { With } from "miniplex";
import { mergeEntity, type Entity } from "../../Entity";
import type { Resource } from "../../Resource";
import type { Engine } from "../../Engine";
import { RNG } from "../../math/rng";

export type MapEntity<TResource extends Resource<TResource>> = With<
  Entity<TResource>,
  | "name"
  | "mapThemeName"
  | "mapLayout"
  | "mapTotalRoomCount"
  | "mapMinDecorationCount"
  | "mapMaxDecorationCount"
  | "seed"
>;

export type RoomEntity<TResource extends Resource<TResource>> = With<
  Entity<TResource>,
  "name" | "contents" | "locationMapName"
>;

export const createRoom = <const TResource extends Resource<TResource>>(
  _engine: Engine<TResource>,
  name: string,
  map: MapEntity<TResource>
): RoomEntity<TResource> => ({
  name,
  contents: [],
  locationMapName: map.name,
});

export type PathEntity<TResource extends Resource<TResource>> = With<
  Entity<TResource>,
  "name" | "location" | "path"
>;

export const createPath = <const TResource extends Resource<TResource>>(
  _engine: Engine<TResource>,
  location: Entity<TResource>,
  destination: Entity<TResource>
): PathEntity<TResource> => ({
  name: `path to ${destination.name}`,
  location,
  path: { destination },
});

export const createMutualPaths = <const TResource extends Resource<TResource>>(
  engine: Engine<TResource>,
  room1: Entity<TResource>,
  room2: Entity<TResource>
): PathEntity<TResource>[] => [
  createPath(engine, room1, room2),
  createPath(engine, room2, room1),
];

export type DecorationEntity<TResource extends Resource<TResource>> = With<
  Entity<TResource>,
  "name" | "location"
>;

export const createDecoration = <const TResource extends Resource<TResource>>(
  engine: Engine<TResource>,
  location: Entity<TResource>,
  mapSpec: MapEntity<TResource>,
  rng: RNG
): DecorationEntity<TResource> =>
  mergeEntity(
    engine.resource.prefabEntityRecord[
      rng.sample(
        engine.resource.mapThemeRecord[mapSpec.mapThemeName]
          .decorationPrefabNames
      )
    ],
    {
      location,
    }
  );

export const createMapEntities = <const TResource extends Resource<TResource>>(
  engine: Engine<TResource>,
  mapSpec: MapEntity<TResource>
): {
  rooms: RoomEntity<TResource>[];
  paths: PathEntity<TResource>[];
  decorations: DecorationEntity<TResource>[];
  allEntities: Entity<TResource>[];
} => {
  // TODO check mapLayout
  const rng = new RNG(mapSpec.seed);
  // TODO Apply themes to room names, decorations, and spawners.
  const rooms: RoomEntity<TResource>[] = Array.from(
    { length: mapSpec.mapTotalRoomCount },
    (_, i) => {
      return createRoom(engine, `Room ${i}`, mapSpec);
    }
  );
  const paths: PathEntity<TResource>[] = [];
  const decorations: DecorationEntity<TResource>[] = [];

  let previousRoom = null;
  for (let i = 0; i < rooms.length; ++i) {
    const room = rooms[i];
    if (previousRoom != null) {
      paths.push(...createMutualPaths(engine, previousRoom, room));
    }

    if (
      mapSpec.mapLoopCount != null &&
      i >= mapSpec.mapTotalRoomCount - mapSpec.mapLoopCount
    ) {
      paths.push(...createMutualPaths(engine, room, rng.sample(rooms, 0, i)));
    }

    const decorationCount = rng.nextInt(
      mapSpec.mapMinDecorationCount,
      mapSpec.mapMaxDecorationCount - 1
    );
    for (let i = 0; i < decorationCount; ++i) {
      decorations.push(createDecoration(engine, room, mapSpec, rng));
    }

    if (
      mapSpec.mapMainPathRoomCount != null &&
      i < mapSpec.mapMainPathRoomCount
    ) {
      previousRoom = room;
    } else {
      previousRoom = rng.sample(rooms, 0, i);
    }
  }

  return {
    rooms,
    paths,
    decorations,
    allEntities: [...rooms, ...paths, ...decorations],
  };
};
