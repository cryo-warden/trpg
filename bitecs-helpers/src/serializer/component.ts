import { EntityId, TsComponent } from "../types";
import { Component } from "bitecs";

type ComponentSerializer = {
  serializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId
  ) => TsComponent<TComponent>;
  deserializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: EntityId,
    data: TsComponent<TComponent>
  ) => void;
};

export const componentSerializer: ComponentSerializer = {
  serializeComponent: (component: any, entityId) => {
    const componentData: any = {};

    for (const key of Object.keys(component)) {
      componentData[key] = component[key][entityId];
    }

    return componentData;
  },
  deserializeComponent: (component: any, entityId, data) => {
    for (const key of Object.keys(data) as (keyof typeof data)[]) {
      if (!(key in component)) {
        throw new Error(`Unknown field name: ${String(key)}`);
      }

      component[key][entityId] = data[key];
    }
  },
};
