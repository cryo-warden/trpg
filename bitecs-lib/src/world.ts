import {
  System,
  createWorld,
  pipe,
  removeEntity,
  addEntity,
  addComponent,
  removeComponent,
} from "bitecs";
import { Entity, EntityId, readEntity, writeEntity } from "./entity";
import { ComponentRegistry, readComponent, writeComponent } from "./component";
import { AsTsSchema, SchemaRecord } from "./schema";

export type TrpgWorld<TSchemaRecord extends SchemaRecord> = {
  step: () => void;
  addEntity: (entity: Entity<TSchemaRecord>) => EntityId;
  removeEntity: (entityId: EntityId) => void;
  readEntity: (entityId: EntityId) => Entity<TSchemaRecord>;
  writeEntity: (entityId: EntityId, entity: Entity<TSchemaRecord>) => void;
  addComponent: <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName,
    data: AsTsSchema<TSchemaRecord[TComponentName]>
  ) => void;
  removeComponent: <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName
  ) => void;
  readComponent: <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName
  ) => AsTsSchema<TSchemaRecord[TComponentName]>;
  writeComponent: <TComponentName extends keyof TSchemaRecord>(
    entityId: EntityId,
    componentName: TComponentName,
    data: AsTsSchema<TSchemaRecord[TComponentName]>
  ) => void;
};

const create = <TSchemaRecord extends SchemaRecord>(
  componentRegistry: ComponentRegistry<TSchemaRecord>,
  systems: System[]
): TrpgWorld<TSchemaRecord> => {
  const world = createWorld();
  const step: System = pipe(...systems);
  const readWorldEntity = readEntity(world, componentRegistry);
  const writeWorldEntity = writeEntity(world, componentRegistry);
  const readWorldComponent = readComponent(componentRegistry);
  const writeWorldComponent = writeComponent(componentRegistry);

  let updateQueue: (() => void)[] = [];

  return {
    step: () => {
      for (let i = 0; i < updateQueue.length; ++i) {
        updateQueue[i]();
      }
      updateQueue = [];

      step(world);
    },
    addEntity: (entity) => {
      const entityId = addEntity(world) as EntityId;
      updateQueue.push(() => {
        writeWorldEntity(entityId, entity);
      });
      return entityId;
    },
    removeEntity: (entityId) => {
      updateQueue.push(() => {
        removeEntity(world, entityId);
      });
    },
    readEntity: readWorldEntity,
    writeEntity: writeWorldEntity,
    addComponent: (entityId, componentName, data) => {
      updateQueue.push(() => {
        const component = componentRegistry.components[componentName];
        addComponent(world, component, entityId);
        writeWorldComponent(entityId, componentName, data);
      });
    },
    removeComponent: (entityId, componentName) => {
      updateQueue.push(() => {
        const component = componentRegistry.components[componentName];
        removeComponent(world, component, entityId);
      });
    },
    readComponent: readWorldComponent,
    writeComponent: writeWorldComponent,
  };
};

export { create };
