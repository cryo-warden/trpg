import { IWorld, addComponent, addEntity } from "bitecs";
import {
  AsTsSchema,
  ComponentRegistry,
  ComponentSpec,
  Schema,
} from "./component";
import { EntityId } from "./world";

export type Entity<
  TComponentRegistry extends ComponentRegistry<ComponentSpec<Schema>[]>
> = Partial<{
  [key in keyof TComponentRegistry]: AsTsSchema<
    TComponentRegistry[key]["schema"]
  >;
}>;

export const createEntity = <
  TComponentRegistry extends ComponentRegistry<ComponentSpec<Schema>[]>
>(
  world: IWorld,
  componentRegistry: TComponentRegistry,
  entity: Entity<TComponentRegistry>
): EntityId => {
  // WIP
  const id = addEntity(world);

  for (const key of Object.keys(entity)) {
    if (!(key in componentRegistry)) {
      throw new Error(`Unknown component name: ${key}`);
    }

    const componentData = entity[key];

    if (componentData == null) {
      continue;
    }

    const componentName = key as keyof TComponentRegistry;
    const { schema, component } = componentRegistry[componentName];

    addComponent(world, component, id);

    // TODO Move component init to component.ts
    for (const fieldKey of Object.keys(componentData)) {
      if (!(fieldKey in schema)) {
        throw new Error(`Unknown field name: ${key}`);
      }
      // TODO Convert enum and boolean to number.
      component[fieldKey][id] = Number(componentData[fieldKey]);
    }
  }

  return id;
};
