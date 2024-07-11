import {
  addComponent,
  addEntity,
  Component,
  getEntityComponents,
  IWorld,
} from "bitecs";
import { componentSerializer } from "./component";
import { ComponentRecord, Entity, EntityId } from "../types";

const { serializeComponent, deserializeComponent } = componentSerializer;

type EntitySerializer<TComponentRecord extends ComponentRecord> = {
  serializeEntity: (
    world: IWorld,
    entityId: EntityId
  ) => Entity<TComponentRecord>;
  deserializeEntity: (
    world: IWorld,
    entity: Entity<TComponentRecord>
  ) => EntityId;
};

type CreateEntitySerializer = <TComponentRecord extends ComponentRecord>(
  bitecs: {
    addComponent: typeof addComponent;
    addEntity: typeof addEntity;
    getEntityComponents: typeof getEntityComponents;
  },
  componentRecord: TComponentRecord
) => EntitySerializer<TComponentRecord>;

export const createEntitySerializer: CreateEntitySerializer = (
  { addComponent, addEntity, getEntityComponents },
  componentRecord
) => {
  const componentNameMap = new Map<Component, keyof typeof componentRecord>(
    Object.entries(componentRecord).map(([key, value]: [any, any]) => [
      value,
      key,
    ])
  );

  return {
    serializeEntity: (world, entityId) => {
      const entityData: any = {};
      const components = getEntityComponents(
        world,
        entityId
      ) as readonly Component[];

      for (const component of components) {
        const name = componentNameMap.get(component);

        if (name != null) {
          entityData[name] = serializeComponent(component, entityId);
        }
      }

      return entityData;
    },
    deserializeEntity: (world, entity: any) => {
      const entityId = addEntity(world) as EntityId;

      for (const key of Object.keys(entity)) {
        if (!(key in componentRecord)) {
          throw new Error(`Entity data has unknown component name: ${key}`);
        }

        const componentName = key as keyof typeof componentRecord;
        const componentData = entity[componentName];
        if (componentData != null) {
          const component: any = componentRecord[componentName];
          addComponent(world, component, entityId);
          deserializeComponent(component, entityId, componentData);
        }
      }

      return entityId;
    },
  };
};
