import { EntityId, TsComponent } from "../types";
import { Component } from "bitecs";

type SerializeComponent = <TComponent extends Component>(
  component: TComponent,
  entityId: EntityId
) => TsComponent<TComponent>;

type DeserializeComponent = <TComponent extends Component>(
  component: TComponent,
  entityId: EntityId,
  data: TsComponent<TComponent>
) => void;

type ComponentSerializer = {
  serializeComponent: SerializeComponent;
  deserializeComponent: DeserializeComponent;
};

const serializeComponent: SerializeComponent = (component: any, entityId) => {
  const componentData: any = {};

  for (const key of Object.keys(component)) {
    componentData[key] = component[key][entityId];
  }

  return componentData;
};

const deserializeComponent: DeserializeComponent = (
  component: any,
  entityId,
  data
) => {
  for (const key of Object.keys(data) as (keyof typeof data)[]) {
    if (!(key in component)) {
      throw new Error(`Unknown field name: ${String(key)}`);
    }

    component[key][entityId] = data[key];
  }
};

export const componentSerializer: ComponentSerializer = {
  serializeComponent,
  deserializeComponent,
};
