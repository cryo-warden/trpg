import { Component, IWorld } from "bitecs";
import * as bitecs from "bitecs";
import {
  ComponentRecord,
  componentSerializer,
  ComponentData,
} from "./component";

type BitecsSubset = {
  addComponent: (typeof bitecs)["addComponent"];
  addEntity: (typeof bitecs)["addEntity"];
  getEntityComponents: (typeof bitecs)["getEntityComponents"];
};

const { serializeComponent, deserializeComponent } = componentSerializer;

const createSerializeEntity =
  ({ getEntityComponents }: BitecsSubset, componentNameMap: any) =>
  (world: any, entityId: number): any => {
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
  };

const createDeserializeEntity =
  ({ addComponent, addEntity }: BitecsSubset, componentRecord: any) =>
  (world: any, entity: any): number => {
    const entityId = addEntity(world);

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
  };

export type EntityData<TComponentRecord extends ComponentRecord> = {
  [key in keyof TComponentRecord]?: ComponentData<TComponentRecord[key]>;
};

export type EntitySerializer<TComponentRecord extends ComponentRecord> = {
  serializeEntity: (
    world: IWorld,
    entityId: number
  ) => EntityData<TComponentRecord>;
  deserializeEntity: (
    world: IWorld,
    entity: EntityData<TComponentRecord>
  ) => number;
};

const createComponentNameMap = (componentRecord: any): any =>
  new Map(Object.entries(componentRecord).map(([key, value]) => [value, key]));

export const createEntitySerializer = <
  TComponentRecord extends ComponentRecord
>(
  bitecsSubset: BitecsSubset,
  componentRecord: TComponentRecord
): EntitySerializer<TComponentRecord> => {
  const componentNameMap = createComponentNameMap(componentRecord);

  return {
    serializeEntity: createSerializeEntity(bitecsSubset, componentNameMap),
    deserializeEntity: createDeserializeEntity(bitecsSubset, componentRecord),
  };
};

export type EntityDataOf<T> = T extends EntitySerializer<infer TComponentRecord>
  ? EntityData<TComponentRecord>
  : T extends EntitySerializer<infer TComponentRecord>["serializeEntity"]
  ? EntityData<TComponentRecord>
  : T extends EntitySerializer<infer TComponentRecord>["deserializeEntity"]
  ? EntityData<TComponentRecord>
  : never;
