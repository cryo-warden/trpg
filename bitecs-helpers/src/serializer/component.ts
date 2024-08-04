import { EntityId, TsComponent } from "../types";
import { Component } from "bitecs";

export type Mapper<TComponent extends Component, U> = {
  serialize: (value: TsComponent<TComponent>) => U;
  deserialize: (value: U) => TsComponent<TComponent>;
};

const serializeComponent = (
  component: any,
  mapper: any,
  entityId: EntityId
): any => {
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
      data[key] = componentSerializer.serializeComponent(field, entityId);
    }
  }

  return mapper.serialize(data);
};

const deserializeComponent = (
  component: any,
  mapper: any,
  entityId: EntityId,
  input: any
): void => {
  const data = mapper.deserialize(input);

  for (const key of Object.keys(data)) {
    if (!(key in component)) {
      throw new Error(`Unknown field name: ${String(key)}`);
    }

    const field: any = component[key];
    const value: any = data[key];

    if (ArrayBuffer.isView(field)) {
      (field as any)[entityId] = data[key];
    } else if (ArrayBuffer.isView(field[entityId])) {
      const componentArray = field[entityId] as unknown as any[];
      for (let i = 0; i < componentArray.length; ++i) {
        componentArray[i] = value[i];
      }
    } else {
      componentSerializer.deserializeComponent(field, entityId, value);
    }
  }
};

export const createComponentSerializer = <
  TComponent extends Component,
  TSerialized = TsComponent<TComponent>
>(
  component: TComponent,
  mapper: Mapper<TComponent, TSerialized>
) => {
  return {
    serializeComponent: (entityId: EntityId): TSerialized =>
      serializeComponent(component, mapper, entityId),
    deserializeComponent: (entityId: EntityId, input: TSerialized): void =>
      deserializeComponent(component, mapper, entityId, input),
  };
};

export const identityMapper: Mapper<any, any> = {
  serialize: (value) => value,
  deserialize: (value) => value,
};

export const componentSerializer = {
  serializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId
  ): TsComponent<TComponent> =>
    serializeComponent(component, identityMapper, entityId),
  deserializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId,
    data: TsComponent<TComponent>
  ): void => deserializeComponent(component, identityMapper, entityId, data),
};
