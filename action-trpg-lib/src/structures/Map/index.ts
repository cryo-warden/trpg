import { createEntityFactory, type Entity } from "../../Entity";

export const themes = ["debug", "cave"] as const;

export type Theme = (typeof themes)[number];

export type MapSpec = {
  theme: Theme;
  mainPathRoomCount: number;
  roomCount: number;
  exits: Entity[];
};

const createEntity = createEntityFactory({ name: "Unknown " });

export const createRoom = (name: string) =>
  createEntity({ name, contents: [] });

export const createPath = (location: Entity, destination: Entity) =>
  createEntity({
    name: `path to ${destination.name}`,
    location,
    path: { destination },
  });

type CreateMapEntities = (mapSpec: MapSpec) => Entity[];

export const createMapEntities: CreateMapEntities = (mapSpec) => {
  // TODO Apply themes to room names, decorations, and spawners.
  const rooms = Array.from({ length: mapSpec.roomCount }, (_, i) => {
    return createRoom(`Room ${i}`);
  });
  const paths: Entity[] = [];
  let previousRoom = null;
  for (let i = 0; i < rooms.length; ++i) {
    const room = rooms[i];
    if (previousRoom != null) {
      paths.push(
        createPath(previousRoom, room),
        createPath(room, previousRoom)
      );
    }
    if (i < mapSpec.mainPathRoomCount) {
      previousRoom = room;
    } else {
      previousRoom = rooms[Math.floor(Math.random() * i)];
    }
  }
  return [...rooms, ...paths];
};
