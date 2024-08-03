import { EntityId, TsComponent } from "../types";
import { Component } from "bitecs";

export const componentSerializer = {
  serializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId
  ): TsComponent<TComponent> => {
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

    return data;
  },
  deserializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId,
    data: TsComponent<TComponent>
  ): void => {
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
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
  },
};
