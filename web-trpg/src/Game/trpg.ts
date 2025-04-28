/*** An adapter for action-trpg-lib which creates concrete types using a fixed resource instance. */

import {
  createEntityFactory,
  createMapEntities,
  createMutualPaths,
  createRoom,
  createStatBlock,
  EngineAction,
  EngineEntity,
  EngineEntityEvent,
  EngineResource,
  prototypeResource,
  ResourceActionName,
  createEngine as unboundCreateEngine,
  PlayerController as UnboundPlayerController,
} from "action-trpg-lib";

// TODO Handle loading resources here.
export const createEngine = () => unboundCreateEngine(prototypeResource);

export type Engine = ReturnType<typeof createEngine>;
export type Resource = EngineResource<Engine>;
export type Entity = EngineEntity<Engine>;
export type ActionName = ResourceActionName<Resource>;
export type Action = EngineAction<Engine>;
export type PlayerController = UnboundPlayerController<Resource>;
export type EntityEvent = EngineEntityEvent<Engine>;

export const createEntities = (engine: Engine) => {
  const createAllegiance = createEntityFactory(engine, {
    name: "Unknown Allegiance",
  });
  const humanity = createAllegiance({ name: "Humanity" });
  const batkind = createAllegiance({ name: "Batkind" });
  const slimekind = createAllegiance({ name: "Slimekind" });
  const allegiances = [humanity, batkind, slimekind] satisfies Entity[];
  const mapEntities = createMapEntities(engine, {
    seed: "debug map",
    theme: "debug",
    exits: [],
    roomCount: 20,
    mainPathRoomCount: 10,
    loopCount: 5,
    decorationRange: { min: 1, max: 5 },
  });
  const rooms = [
    createRoom(engine, "Origin"),
    createRoom(engine, "Second Room"),
    ...mapEntities.rooms,
  ] satisfies Entity[];
  const paths = [
    ...createMutualPaths(engine, rooms[0], rooms[1]),
    ...createMutualPaths(engine, rooms[0], rooms[2]),
    ...mapEntities.paths,
  ] satisfies Entity[];
  const createItem = createEntityFactory(engine, {
    name: "item",
    location: rooms[0],
    takeable: true,
  });
  const createActor = createEntityFactory(engine, {
    name: "Unknown",
    location: rooms[0],
    hp: 5,
    mhp: 5,
    cdp: 0,
    ep: 5,
    mep: 5,
    sequenceController: { type: "sequence", sequenceIndex: 0 },
    observable: [],
    criticalDamageThreshold: 4,
    status: {},
  });
  const magicHat = createItem({
    name: "magic hat",
    equippable: {
      capacityCost: 2,
      slot: "head",
      statBlock: createStatBlock({ mep: 10 }),
    },
  });
  const items = [
    magicHat,
    createItem({
      name: "magic stick",
      equippable: {
        capacityCost: 2,
        slot: "hand",
        statBlock: createStatBlock({
          actionSet: new Set(["jab"]),
        }),
      },
    }),
  ] satisfies Entity[];
  const createHuman = createEntityFactory(
    engine,
    createActor({
      name: "Human",
      contents: [],
      allegiance: humanity,
      baseline: "human",
    })
  );
  const { sequenceController: _, ...player } = createHuman({
    name: "Player",
    location: rooms[0],
    contents: [],
    traits: ["hero", "mobile", "collecting", "equipping"],
    equipment: [magicHat],
    playerController: {
      id: "me",
      actionQueue: [],
      hotkeyMap: {
        move: "m",
        take: "t",
        guard: "g",
        jab: "j",
        equip: "e",
        unequip: "u",
      },
    },
    observer: [],
  });
  magicHat.location = player;
  const createBat = createEntityFactory(
    engine,
    createActor({
      name: "bat",
      allegiance: batkind,
      baseline: "bat",
    })
  );
  const createSlime = createEntityFactory(
    engine,
    createActor({
      name: "slime",
      allegiance: slimekind,
      baseline: "slime",
      criticalDamageThreshold: 2,
    })
  );
  const actors = [
    player,
    ...Array.from({ length: 3 }, () => createBat({ location: rooms[1] })),
    ...Array.from({ length: 4 }, () => createSlime({ location: rooms[1] })),
  ] satisfies Entity[];
  return [
    ...allegiances,
    ...rooms,
    ...paths,
    ...mapEntities.decorations,
    ...items,
    ...actors,
  ] satisfies Entity[];
};
