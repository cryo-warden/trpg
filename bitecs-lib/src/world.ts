import {
  System,
  createWorld,
  pipe,
  removeEntity,
  addEntity,
  addComponent,
  removeComponent,
  hasComponent,
} from "bitecs";
import { Entity, EntityId, readEntity, writeEntity } from "./entity";
import { ComponentRecord, readComponent, writeComponent } from "./component";
import { AsTsSchema, SchemaRecord } from "./schema";

export type TrpgWorld<TSchemaRecord extends SchemaRecord> = {
  hasComponent: (
    entityId: EntityId,
    componentName: keyof TSchemaRecord
  ) => boolean;
  flushUpdates: () => void;
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
  componentRecord: ComponentRecord<TSchemaRecord>,
  systems: System[]
): TrpgWorld<TSchemaRecord> => {
  const world = createWorld();

  let updateQueue: (() => void)[] = [];
  const flushUpdates = () => {
    for (let i = 0; i < updateQueue.length; ++i) {
      updateQueue[i]();
    }
    updateQueue = [];
  };

  const step: System = pipe(...systems);
  const readWorldEntity = readEntity(world, componentRecord);
  const writeWorldEntity = writeEntity(world, componentRecord);
  const readWorldComponent = readComponent(componentRecord);
  const writeWorldComponent = writeComponent(componentRecord);

  return {
    hasComponent: (entityId, componentName) =>
      hasComponent(world, componentRecord[componentName], entityId),
    flushUpdates,
    step: () => {
      flushUpdates();
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
        addComponent(world, componentRecord[componentName], entityId);
        writeWorldComponent(entityId, componentName, data);
      });
    },
    removeComponent: (entityId, componentName) => {
      updateQueue.push(() => {
        removeComponent(world, componentRecord[componentName], entityId);
      });
    },
    readComponent: readWorldComponent,
    writeComponent: writeWorldComponent,
  };
};

export { create };
