import type { With } from "miniplex";
import { createEntityFactory, type Entity } from "../../Entity";

const sample = <T>(items: readonly T[], upperBound?: number): T => {
  const i = Math.floor(Math.random() * (upperBound ?? items.length));
  return items[i];
};

export const themes = {
  debug: {
    decorationNames: [
      "anvil",
      "sprocket",
      "gizmo",
      "dealymabob",
      "thingamajig",
    ],
  },
  cave: { decorationNames: ["stalactite", "stalagmite"] },
} as const;

export type ThemeName = keyof typeof themes;

export type MapSpec = {
  theme: ThemeName;
  mainPathRoomCount: number;
  roomCount: number;
  loopCount: number;
  decorationRange: { min: number; max: number };
  exits: Entity[];
};

const createEntity = createEntityFactory({ name: "Unknown " });

export const createRoom = (name: string): With<Entity, "contents"> =>
  createEntity({ name, contents: [] });

export const createPath = (
  location: Entity,
  destination: Entity
): With<Entity, "location" | "path"> =>
  createEntity({
    name: `path to ${destination.name}`,
    location,
    path: { destination },
  });

export const createMutualPaths = (room1: Entity, room2: Entity) => [
  createPath(room1, room2),
  createPath(room2, room1),
];

export const createDecoration = (location: Entity, mapSpec: MapSpec) =>
  createEntity({
    name: sample(themes[mapSpec.theme].decorationNames),
    location,
  });

type CreateMapEntities = (mapSpec: MapSpec) => {
  rooms: Entity[];
  paths: Entity[];
  decorations: Entity[];
  allEntities: Entity[];
};

export const createMapEntities: CreateMapEntities = (mapSpec) => {
  // TODO Apply themes to room names, decorations, and spawners.
  const rooms = Array.from({ length: mapSpec.roomCount }, (_, i) => {
    return createRoom(`Room ${i}`);
  });
  const paths: Entity[] = [];
  const decorations: Entity[] = [];

  let previousRoom = null;
  for (let i = 0; i < rooms.length; ++i) {
    const room = rooms[i];
    if (previousRoom != null) {
      paths.push(...createMutualPaths(previousRoom, room));
    }

    if (i >= mapSpec.roomCount - mapSpec.loopCount) {
      paths.push(...createMutualPaths(room, sample(rooms, i)));
    }

    const decorationCount = Math.floor(
      mapSpec.decorationRange.min + Math.random() * mapSpec.decorationRange.max
    );
    for (let i = 0; i < decorationCount; ++i) {
      decorations.push(createDecoration(room, mapSpec));
    }

    if (i < mapSpec.mainPathRoomCount) {
      previousRoom = room;
    } else {
      previousRoom = sample(rooms, i);
    }
  }

  return {
    rooms,
    paths,
    decorations,
    allEntities: [...rooms, ...paths, ...decorations],
  };
};
