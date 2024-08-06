import { Component, ComponentType, ISchema, ListType } from "bitecs";

export type ComponentRecord<
  TSchemaRecord extends Readonly<Record<string, ISchema>> = {}
> = {
  [key in keyof TSchemaRecord]: ComponentType<TSchemaRecord[key]>;
};

type RawComponentData<TComponent> = {
  [key in keyof TComponent & string]: TComponent extends ComponentType<
    infer TSchema
  >
    ? key extends keyof TSchema
      ? TSchema[key] extends ListType
        ? number[]
        : TSchema[key] extends ISchema
        ? RawComponentData<ComponentType<TSchema[key]>>
        : number
      : never
    : never;
};

export type Mapper<TBase, TResult> = {
  map: (value: TBase) => TResult;
  demap: (value: TResult) => TBase;
};

type MapperResult<T> = T extends Mapper<any, infer TResult> ? TResult : never;

const $mapper = Symbol("mapper");

export type MappedComponent<TComponent, TMapper> =
  TComponent extends ComponentType<infer TSchema>
    ? ComponentType<TSchema> & { readonly [$mapper]: TMapper }
    : never;

export type ComponentData<TComponent> = TComponent extends MappedComponent<
  any,
  infer TMapper
>
  ? MapperResult<TMapper>
  : RawComponentData<TComponent>;

export const toMappedComponent = <
  const TComponent extends Component,
  const TMapper extends Mapper<RawComponentData<TComponent>, any>
>(
  component: TComponent,
  mapper: TMapper
): MappedComponent<TComponent, TMapper> => {
  if ($mapper in component) {
    throw new Error(
      "Attempted to attach a Mapper to a Component which already has an attached Mapper."
    );
  }

  const mappedComponent: MappedComponent<TComponent, TMapper> =
    component as any;
  // Only this function is permitted to circumvent the readonly attribute.
  (mappedComponent as any)[$mapper] = mapper;

  return mappedComponent;
};

const serializeComponent = (component: any, entityId: number): any => {
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
      data[key] = serializeComponent(field, entityId);
    }
  }

  return $mapper in component ? component[$mapper].map(data) : data;
};

const deserializeComponent = (
  component: any,
  entityId: number,
  data: any
): void => {
  const mappedData =
    $mapper in component ? component[$mapper].demap(data) : data;

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
      deserializeComponent(field, entityId, value);
    }
  }
};

export const componentSerializer: {
  serializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: number
  ) => ComponentData<TComponent>;
  deserializeComponent: <TComponent extends Component>(
    component: TComponent,
    entityId: number,
    // Build chain currently does not support NoInfer :(
    // data: NoInfer<ComponentData<TComponent>>
    data: ComponentData<TComponent>
  ) => void;
} = { serializeComponent, deserializeComponent };
