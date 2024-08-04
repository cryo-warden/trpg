import { Component, IWorld } from "bitecs";
import * as bitecs from "bitecs";
import { createComponentSerializer, Mapper } from "./component";
import { ComponentRecord, EntityId, TsComponent } from "../types";

type BitecsSubset = {
  addComponent: (typeof bitecs)["addComponent"];
  addEntity: (typeof bitecs)["addEntity"];
  getEntityComponents: (typeof bitecs)["getEntityComponents"];
};

const createSerializeEntity =
  (
    { getEntityComponents }: BitecsSubset,
    componentNameMap: any,
    componentSerializerRecord: any
  ) =>
  (world: any, entityId: EntityId): any => {
    const entityData: any = {};
    const components = getEntityComponents(
      world,
      entityId
    ) as readonly Component[];

    for (const component of components) {
      const name = componentNameMap.get(component);

      if (name != null) {
        entityData[name] =
          componentSerializerRecord[name].serializeComponent(entityId);
      }
    }

    return entityData;
  };

const createDeserializeEntity =
  (
    { addComponent, addEntity }: BitecsSubset,
    componentRecord: any,
    componentSerializerRecord: any
  ) =>
  (world: any, entity: any): EntityId => {
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
        componentSerializerRecord[componentName].deserializeComponent(
          entityId,
          componentData
        );
      }
    }

    return entityId;
  };

export type MapperRecord<
  TComponentRecord extends ComponentRecord,
  TRecord extends Record<keyof TComponentRecord, any>
> = Partial<{
  [key in keyof TComponentRecord]: Mapper<
    TComponentRecord[key] extends Component ? TComponentRecord[key] : never,
    TRecord[key]
  >;
}>;

export type EntityData<
  TComponentRecord extends ComponentRecord,
  TMapperRecord extends MapperRecord<TComponentRecord, any>
> = {
  [key in keyof TComponentRecord]?: TMapperRecord[key] extends Mapper<
    any,
    infer T
  >
    ? T
    : TsComponent<TComponentRecord[key]>;
};

export type EntitySerializer<
  TComponentRecord extends ComponentRecord,
  TMapperRecord extends MapperRecord<TComponentRecord, any>
> = {
  serializeEntity: (
    world: IWorld,
    entityId: EntityId
  ) => EntityData<TComponentRecord, TMapperRecord>;
  deserializeEntity: (
    world: IWorld,
    entity: EntityData<TComponentRecord, TMapperRecord>
  ) => EntityId;
};

const createComponentNameMap = (componentRecord: any): any =>
  new Map(Object.entries(componentRecord).map(([key, value]) => [value, key]));

const createComponentSerializerRecord = (
  componentRecord: any,
  mapperRecord: any
) =>
  Object.keys(componentRecord).reduce((result: any, key) => {
    result[key] = createComponentSerializer(
      componentRecord[key],
      mapperRecord[key]
    );
    return result;
  }, {});

export const createEntitySerializer = <
  TComponentRecord extends ComponentRecord,
  TMapperRecord extends MapperRecord<TComponentRecord, any>
>(
  bitecsSubset: BitecsSubset,
  componentRecord: TComponentRecord,
  mapperRecord: Partial<TMapperRecord> = {}
): EntitySerializer<TComponentRecord, TMapperRecord> => {
  const componentNameMap = createComponentNameMap(componentRecord);

  const componentSerializerRecord = createComponentSerializerRecord(
    componentRecord,
    mapperRecord
  );

  return {
    serializeEntity: createSerializeEntity(
      bitecsSubset,
      componentNameMap,
      componentSerializerRecord
    ),
    deserializeEntity: createDeserializeEntity(
      bitecsSubset,
      componentRecord,
      componentSerializerRecord
    ),
  };
};

export type EntityDataOf<T> = T extends EntitySerializer<
  infer TComponentRecord,
  infer TMapperRecord
>
  ? EntityData<TComponentRecord, TMapperRecord>
  : T extends EntitySerializer<
      infer TComponentRecord,
      infer TMapperRecord
    >["serializeEntity"]
  ? EntityData<TComponentRecord, TMapperRecord>
  : T extends EntitySerializer<
      infer TComponentRecord,
      infer TMapperRecord
    >["deserializeEntity"]
  ? EntityData<TComponentRecord, TMapperRecord>
  : never;
