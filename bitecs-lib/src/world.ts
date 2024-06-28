import { System, createWorld, pipe, removeEntity, addEntity } from "bitecs";
import { Entity, EntityId, readEntity, writeEntity } from "./entity";
import { ComponentRegistry, SchemaRecord } from "./component";

export type TrpgWorld<TSchemaRecord extends SchemaRecord> = {
  step: () => void;
  createEntity: (entity: Entity<TSchemaRecord>) => EntityId;
  destroyEntity: (entityId: EntityId) => void;
  readEntity: (entityId: EntityId) => Entity<TSchemaRecord>;
  writeEntity: (entityId: EntityId, entity: Entity<TSchemaRecord>) => void;
  // WIP
  // addComponent: ...;
  // removeComponent: ...;
  // readComponent: <TComponentName extends keyof TSchemaRecord>(entityId: EntityId, componentName: TComponentName) => AsTsSchema<TSchemaRecord[TComponentName]>
  // writeComponent: <TComponentName extends keyof TSchemaRecord>(entityId: EntityId, componentName: TComponentName, data: AsTsSchema<TSchemaRecord[TComponentName]>) => void
};

const create = <TSchemaRecord extends SchemaRecord>(
  componentRegistry: ComponentRegistry<TSchemaRecord>,
  systems: System[]
): TrpgWorld<TSchemaRecord> => {
  const world = createWorld();
  const step: System = pipe(...systems);
  const writeWorldEntity = writeEntity(world, componentRegistry);

  let updateQueue: (() => void)[] = [];

  return {
    step: () => {
      for (let i = 0; i < updateQueue.length; ++i) {
        updateQueue[i]();
      }
      updateQueue = [];

      step(world);
    },
    createEntity: (entity: Entity<TSchemaRecord>) => {
      const entityId = addEntity(world) as EntityId;
      updateQueue.push(() => {
        writeWorldEntity(entityId, entity);
      });
      return entityId;
    },
    destroyEntity: (entityId: EntityId) => {
      updateQueue.push(() => {
        removeEntity(world, entityId);
      });
    },
    readEntity: readEntity(world, componentRegistry),
    writeEntity: writeWorldEntity,
  };
};

export { create };
