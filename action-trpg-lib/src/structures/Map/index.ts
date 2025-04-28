import type { With } from "miniplex";
import { mergeEntity, type Entity } from "../../Entity";
import type { Resource, ResourceMapThemeName } from "../../Resource";
import type { Engine } from "../../Engine";
import Prando from "prando";

const sample = <T>(
  rng: Prando,
  items: readonly T[],
  upperBound?: number
): T => {
  const i = rng.nextInt(0, (upperBound ?? items.length) - 1);
  return items[i];
};

export type MapSpec<TResource extends Resource<TResource>> = {
  seed: string;
  theme: ResourceMapThemeName<TResource>;
  mainPathRoomCount: number;
  roomCount: number;
  loopCount: number;
  decorationRange: { min: number; max: number };
  exits: Entity<TResource>[];
};

export type RoomEntity<TResource extends Resource<TResource>> = With<
  Entity<TResource>,
  "name" | "contents"
>;

export const createRoom = <const TResource extends Resource<TResource>>(
  _engine: Engine<TResource>,
  name: string
): RoomEntity<TResource> => ({
  name,
  contents: [],
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
  mapSpec: MapSpec<TResource>,
  rng: Prando
): DecorationEntity<TResource> =>
  mergeEntity(
    engine.resource.prefabEntityRecord[
      sample(
        rng,
        engine.resource.mapThemeRecord[mapSpec.theme].decorationPrefabNames
      )
    ],
    {
      location,
    }
  );

export const createMapEntities = <const TResource extends Resource<TResource>>(
  engine: Engine<TResource>,
  mapSpec: MapSpec<TResource>
): {
  rooms: RoomEntity<TResource>[];
  paths: PathEntity<TResource>[];
  decorations: DecorationEntity<TResource>[];
  allEntities: Entity<TResource>[];
} => {
  const rng = new Prando(mapSpec.seed);
  // TODO Apply themes to room names, decorations, and spawners.
  const rooms: RoomEntity<TResource>[] = Array.from(
    { length: mapSpec.roomCount },
    (_, i) => {
      return createRoom(engine, `Room ${i}`);
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

    if (i >= mapSpec.roomCount - mapSpec.loopCount) {
      paths.push(...createMutualPaths(engine, room, sample(rng, rooms, i)));
    }

    const decorationCount = rng.nextInt(
      mapSpec.decorationRange.min,
      mapSpec.decorationRange.max - 1
    );
    for (let i = 0; i < decorationCount; ++i) {
      decorations.push(createDecoration(engine, room, mapSpec, rng));
    }

    if (i < mapSpec.mainPathRoomCount) {
      previousRoom = room;
    } else {
      previousRoom = sample(rng, rooms, i);
    }
  }

  return {
    rooms,
    paths,
    decorations,
    allEntities: [...rooms, ...paths, ...decorations],
  };
};
