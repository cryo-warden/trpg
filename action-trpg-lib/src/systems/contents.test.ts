import { expect, describe, test } from "bun:test";
import { createEntityFactory } from "../Entity";
import { createMutualPaths, createRoom } from "../structures/Map";
import { createEngine } from "../Engine";
import contents from "./contents";
import { bindSystems } from "../System";
import actor from "./actor";
import { createActionState } from "../structures/ActionState";
import { action } from "../structures/prototypeAction";

const createEntity = createEntityFactory({
  name: "test entity",
  location: null,
  actor: { attack: 0, actionState: null },
});

describe("contents system", () => {
  test("can correctly determine contents from location", () => {
    const engine = createEngine();
    const rooms = [
      createRoom("test room 1"),
      createRoom("test room 2"),
      createRoom("test room 3"),
    ];
    const paths = [
      ...createMutualPaths(rooms[0], rooms[1]),
      ...createMutualPaths(rooms[1], rooms[2]),
    ];
    const locationEntities = [
      createEntity({ location: rooms[0] }),
      createEntity({ location: rooms[0] }),
      createEntity({ location: rooms[0] }),
      createEntity({ location: rooms[1] }),
      createEntity({ location: rooms[1] }),
      createEntity({ location: rooms[2] }),
    ];
    const entities = [...rooms, ...paths, ...locationEntities];
    for (const entity of entities) {
      engine.world.add(entity);
    }

    const actorSystem = actor(engine);
    const system = bindSystems([actor, contents], engine);

    expect(rooms[0].contents.length).toBe(0);
    expect(rooms[1].contents.length).toBe(0);
    expect(rooms[2].contents.length).toBe(0);

    system();
    expect(rooms[0].contentsCleanFlag).toBeDefined();
    expect(rooms[1].contentsCleanFlag).toBeDefined();
    expect(rooms[2].contentsCleanFlag).toBeDefined();
    expect(rooms[0].contents.length).toBe(4);
    expect(rooms[1].contents.length).toBe(4);
    expect(rooms[2].contents.length).toBe(2);

    locationEntities[0].actor.actionState = createActionState(action.move, [
      paths[0],
    ]);

    // After actions but before updating contents, expect two clean flags to be gone.
    actorSystem();
    expect(rooms[0].contentsCleanFlag).toBeUndefined();
    expect(rooms[1].contentsCleanFlag).toBeUndefined();
    expect(rooms[2].contentsCleanFlag).toBeDefined();

    system();
    expect(locationEntities[0].location).toBe(rooms[1]);
    expect(rooms[0].contentsCleanFlag).toBeDefined();
    expect(rooms[1].contentsCleanFlag).toBeDefined();
    expect(rooms[2].contentsCleanFlag).toBeDefined();
    expect(rooms[0].contents.length).toBe(3);
    expect(rooms[1].contents.length).toBe(5);
    expect(rooms[2].contents.length).toBe(2);

    locationEntities[0].actor.actionState = createActionState(action.move, [
      paths[2],
    ]);
    locationEntities[3].actor.actionState = createActionState(action.move, [
      paths[2],
    ]);

    // After actions but before updating contents, expect two clean flags to be gone.
    actorSystem();
    expect(rooms[0].contentsCleanFlag).toBeDefined();
    expect(rooms[1].contentsCleanFlag).toBeUndefined();
    expect(rooms[2].contentsCleanFlag).toBeUndefined();

    system();
    expect(locationEntities[0].location).toBe(rooms[2]);
    expect(locationEntities[3].location).toBe(rooms[2]);
    expect(rooms[0].contentsCleanFlag).toBeDefined();
    expect(rooms[1].contentsCleanFlag).toBeDefined();
    expect(rooms[2].contentsCleanFlag).toBeDefined();
    expect(rooms[0].contents.length).toBe(3);
    expect(rooms[1].contents.length).toBe(3);
    expect(rooms[2].contents.length).toBe(4);
  });
});
