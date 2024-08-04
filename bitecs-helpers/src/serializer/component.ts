import { EntityId, TsComponent } from "../types";
import { Component } from "bitecs";

const identityMapper: Mapper<any, any> = {
  serialize: (value) => value,
  deserialize: (value) => value,
};

const createSerializeComponent =
  (component: any, mapper: any = identityMapper) =>
  (entityId: EntityId): any => {
    const data: any = {};

    for (const key of Object.keys(component)) {
      const field: any = (component as any)[key];

      if (ArrayBuffer.isView(field)) {
        data[key] = (field as any)[entityId];
      } else if (ArrayBuffer.isView(field[entityId])) {
        const valueArray: any[] = [];
        const componentArray = field[entityId] as unknown as any[];
        for (let i = 0; i < componentArray.length; ++i) {
          valueArray.push(componentArray[i]);
        }
        data[key] = valueArray;
      } else {
        data[key] = createSerializeComponent(field)(entityId);
      }
    }

    return mapper.serialize(data);
  };

const createDeserializeComponent =
  (component: any, mapper: any = identityMapper) =>
  (entityId: EntityId, data: any): void => {
    const mappedData = mapper.deserialize(data);

    for (const key of Object.keys(mappedData)) {
      if (!(key in component)) {
        throw new Error(`Unknown field name: ${String(key)}`);
      }

      const field = component[key];
      const value = mappedData[key];

      if (ArrayBuffer.isView(field)) {
        (field as any)[entityId] = mappedData[key];
      } else if (ArrayBuffer.isView(field[entityId])) {
        const componentArray = field[entityId] as unknown as any[];
        for (let i = 0; i < componentArray.length; ++i) {
          componentArray[i] = value[i];
        }
      } else {
        createDeserializeComponent(field)(entityId, value);
      }
    }
  };

export type Mapper<TComponent extends Component, T> = {
  serialize: (value: TsComponent<TComponent>) => T;
  deserialize: (value: T) => TsComponent<TComponent>;
};

export type ComponentSerializer<
  TComponent extends Component,
  TMapper = Mapper<TComponent, any>
> = TMapper extends Mapper<TComponent, infer T>
  ? {
      serializeComponent: (entityId: EntityId) => T;
      deserializeComponent: (entityId: EntityId, data: T) => void;
    }
  : TsComponent<TComponent> extends infer T
  ? {
      serializeComponent: (entityId: EntityId) => T;
      deserializeComponent: (entityId: EntityId, data: T) => void;
    }
  : never;

export const createComponentSerializer = <
  TComponent extends Component,
  TMapper = Mapper<TComponent, any>
>(
  component: TComponent,
  mapper?: TMapper
): ComponentSerializer<TComponent, TMapper> => {
  return {
    serializeComponent: createSerializeComponent(component, mapper),
    deserializeComponent: createDeserializeComponent(component, mapper),
  } as any;
};

export const componentSerializer = {
  serializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId
  ): TsComponent<TComponent> => createSerializeComponent(component)(entityId),
  deserializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId,
    data: TsComponent<TComponent>
  ): void => createDeserializeComponent(component)(entityId, data),
};
