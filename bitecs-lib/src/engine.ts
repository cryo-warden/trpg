import {
  pipe,
  removeEntity,
  addEntity,
  addComponent,
  removeComponent,
  type IWorld,
  type System,
} from "bitecs";
import { Entity, EntityId, readEntity, writeEntity } from "./entity";
import {
  Component,
  ComponentRecord,
  readComponent,
  writeComponent,
} from "./component";
import { AsTsSchema, SchemaRecord } from "./schema";
import { createActionQueue } from "./actionQueue";

export type Engine<TSchemaRecord extends SchemaRecord> = {
  step: (world: IWorld) => void;
  addEntity: (world: IWorld, entity: Entity<TSchemaRecord>) => EntityId;
  removeEntity: (world: IWorld, entityId: EntityId) => void;
  readEntity: (world: IWorld, entityId: EntityId) => Entity<TSchemaRecord>;
  writeEntity: (
    world: IWorld,
    entityId: EntityId,
    entity: Entity<TSchemaRecord>
  ) => void;
  getComponent: <TComponentName extends keyof TSchemaRecord>(
    componentName: TComponentName
  ) => Component<TSchemaRecord[TComponentName]>;
  addComponent: <TComponentName extends keyof TSchemaRecord>(
    world: IWorld,
    entityId: EntityId,
    componentName: TComponentName,
    data: AsTsSchema<TSchemaRecord[TComponentName]>
  ) => void;
  removeComponent: <TComponentName extends keyof TSchemaRecord>(
    world: IWorld,
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
  flushUpdates: () => void;
};

export const createEngine = <TSchemaRecord extends SchemaRecord>(
  componentRecord: ComponentRecord<TSchemaRecord>,
  systems: System[]
): Engine<TSchemaRecord> => {
  const updateQueue = createActionQueue();

  const step: System<[]> = pipe(...systems);
  const readRecordEntity = readEntity(componentRecord);
  const writeRecordEntity = writeEntity(componentRecord);
  const readRecordComponent = readComponent(componentRecord);
  const writeRecordComponent = writeComponent(componentRecord);

  return {
    step: (world) => {
      updateQueue.flush();
      step(world);
    },
    addEntity: (world, entity) => {
      const entityId = addEntity(world) as EntityId;
      updateQueue.push(() => {
        writeRecordEntity(world, entityId, entity);
      });
      return entityId;
    },
    removeEntity: (world, entityId) => {
      updateQueue.push(() => {
        removeEntity(world, entityId);
      });
    },
    readEntity: readRecordEntity,
    writeEntity: writeRecordEntity,
    getComponent: (componentName) => componentRecord[componentName],
    addComponent: (world, entityId, componentName, data) => {
      updateQueue.push(() => {
        addComponent(world, componentRecord[componentName], entityId);
        writeRecordComponent(entityId, componentName, data);
      });
    },
    removeComponent: (world, entityId, componentName) => {
      updateQueue.push(() => {
        removeComponent(world, componentRecord[componentName], entityId);
      });
    },
    readComponent: readRecordComponent,
    writeComponent: writeRecordComponent,
    flushUpdates: updateQueue.flush,
  };
};
