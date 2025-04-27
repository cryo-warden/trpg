import { describe, expect, test } from "bun:test";
import { action } from "../prototypeData";
import { createEngine } from "../src/Engine";
import { type EngineEntity } from "../src/Entity";
import { createEntityFactory } from "../src/Entity";
import { createActionState } from "../src/structures/ActionState";
import { createMutualPaths, createRoom } from "../src/structures/Map";
import { joinSystems } from "../src/System";
import advance from "../src/systems/action/advance";
import move from "../src/systems/action/move";
import contents from "../src/systems/contents";
import { event } from "../src/systems/event";

describe("contents system", () => {
  test("can correctly determine contents from location", () => {
    const engine = createEngine({
      actionRecord: action,
      baselineRecord: {},
      traitRecord: {},
    });

    const createEntity = createEntityFactory(engine, {
      name: "test entity",
    });

    type TestEntity = EngineEntity<typeof engine>;
    const rooms = [
      createRoom(engine, "test room 1"),
      createRoom(engine, "test room 2"),
      createRoom(engine, "test room 3"),
    ];
    const paths = [
      ...createMutualPaths(engine, rooms[0], rooms[1]),
      ...createMutualPaths(engine, rooms[1], rooms[2]),
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

    const moveSystem = joinSystems([move, advance, event.resolve])(engine);
    const contentsSystem = contents(engine);

    expect(rooms[0].contents.length).toBe(0);
    expect(rooms[1].contents.length).toBe(0);
    expect(rooms[2].contents.length).toBe(0);

    contentsSystem();
    expect(rooms[0].contentsCleanFlag).toBeDefined();
    expect(rooms[1].contentsCleanFlag).toBeDefined();
    expect(rooms[2].contentsCleanFlag).toBeDefined();
    expect(rooms[0].contents.length).toBe(4);
    expect(rooms[1].contents.length).toBe(4);
    expect(rooms[2].contents.length).toBe(2);

    engine.world.addComponent(
      locationEntities[0],
      "actionState",
      createActionState(engine, "move", [paths[0]])
    );

    // After actions but before updating contents, expect two clean flags to be gone.
    moveSystem();
    expect(rooms[0].contentsCleanFlag).toBeUndefined();
    expect(rooms[1].contentsCleanFlag).toBeUndefined();
    expect(rooms[2].contentsCleanFlag).toBeDefined();

    contentsSystem();
    expect(locationEntities[0].location).toBe(rooms[1]);
    expect(rooms[0].contentsCleanFlag).toBeDefined();
    expect(rooms[1].contentsCleanFlag).toBeDefined();
    expect(rooms[2].contentsCleanFlag).toBeDefined();
    expect(rooms[0].contents.length).toBe(3);
    expect(rooms[1].contents.length).toBe(5);
    expect(rooms[2].contents.length).toBe(2);

    engine.world.addComponent(
      locationEntities[0],
      "actionState",
      createActionState(engine, "move", [paths[2]])
    );
    engine.world.addComponent(
      locationEntities[3],
      "actionState",
      createActionState(engine, "move", [paths[2]])
    );

    // After actions but before updating contents, expect two clean flags to be gone.
    moveSystem();
    expect(rooms[0].contentsCleanFlag).toBeDefined();
    expect(rooms[1].contentsCleanFlag).toBeUndefined();
    expect(rooms[2].contentsCleanFlag).toBeUndefined();

    contentsSystem();
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
