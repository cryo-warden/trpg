import {
  Component,
  IWorld,
  System,
  createWorld,
  defineQuery,
  pipe,
  getEntityComponents,
  removeEntity,
} from "bitecs";
import { Types, createComponentRegistry } from "./component";
import { Entity, createEntity } from "./entity";

const componentRegistry = createComponentRegistry([
  { name: "Player", schema: {} },
  { name: "Counter", schema: { value: Types.i32 } },
  { name: "Demo", schema: { i32: Types.i32, i8: Types.i8, eid: Types.eid } },
] as const);

const Player = componentRegistry.Player.component;
const Counter = componentRegistry.Counter.component;
// const Demo = componentRegistry.Demo.component;

const componentNameMap: Map<Component, string> = new Map(
  Object.entries(componentRegistry).map(([key, value]) => [
    value.component,
    key,
  ])
);

const destroyEntity = (world: IWorld, entity: number) => {
  const entityData: Entity<typeof componentRegistry> = {};
  const components = getEntityComponents(world, entity);
  for (const component of components) {
    const name = componentNameMap.get(component);
    const componentData: Record<string, any> = {};
    if (name != null) {
      for (const field of Object.keys(component)) {
        componentData[field] = (component as any)[field][entity];
      }
      (entityData as any)[name] = componentData;
    }
  }
  removeEntity(world, entity);
  return entityData;
};

const playerQuery = defineQuery([Player]);
const counterQuery = defineQuery([Counter]);

const counterSystem: System = (world) => {
  const entities = counterQuery(world);
  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    if (Math.random() >= 0.5) {
      Counter.value[entity]++;
    } else {
      Counter.value[entity]--;
    }
  }
  return world;
};

const countWatcherSystem: System = (world) => {
  const players = playerQuery(world);
  const entities = counterQuery(world);
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    for (let j = 0; j < entities.length; j++) {
      const entity = entities[j];
      const distance = Math.abs(Counter.value[entity] - Counter.value[player]);
      if (distance < 10) {
        console.log(
          `Player ${player} at ${Counter.value[player]} sees ${entity} at ${distance} away.`
        );
      } else {
        console.log(
          `Player ${player} at ${Counter.value[player]} cannot see ${entity} at ${distance} away.`
        );
      }
    }
  }
  return world;
};

const step: System = pipe(counterSystem, countWatcherSystem);

export type EntityId = number;
export type Observer = {};
export type Actor = {};

export type TrpgWorld = {
  getObserver: (entityId: EntityId) => Observer;
  getActor: (entityId: EntityId) => Actor;
  step: () => void;
  createEntity: (entity: Entity<typeof componentRegistry>) => EntityId;
  destroyEntity: (entityId: EntityId) => Entity<typeof componentRegistry>;
};

const create = (): TrpgWorld => {
  const world = createWorld();
  return {
    getObserver: (entityId: EntityId) => {
      // WIP
      return {};
    },
    getActor: (entityId: EntityId) => {
      // WIP
      return {};
    },
    step: () => {
      step(world);
    },
    createEntity: (entity) => createEntity(world, componentRegistry, entity),
    destroyEntity: (entityId: EntityId) => destroyEntity(world, entityId),
  };
};

export { create };
