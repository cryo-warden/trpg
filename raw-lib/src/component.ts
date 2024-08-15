import { Entity } from "./entity";

export type ComponentStructField =
  | boolean
  | number
  | string
  | ComponentStruct
  | ComponentStructField[];

export type ComponentStruct = {
  [key: string]: ComponentStructField;
};

export class Component<
  TComponentStruct extends ComponentStruct = ComponentStruct
> {
  private factory;
  private structs: TComponentStruct[] = [];
  private entities: Entity[] = [];
  private entitySet = new Set<Entity>();

  constructor(factory: () => TComponentStruct) {
    this.factory = factory;
  }

  has(entity: Entity) {
    return this.entitySet.has(entity);
  }

  add(entity: Entity) {
    this.entitySet.add(entity);
    this.entities.push(entity);
    return this.structs.push(this.factory()) - 1;
  }

  get(index: number) {
    return this.structs[index];
  }

  remove(entity: Entity) {
    if (!this.entitySet.delete(entity)) {
      return;
    }

    for (let i = this.entities.length - 1; i >= 0; --i) {
      if (this.entities[i] !== entity) {
        continue;
      }

      this.entities.splice(i, 1);
      this.structs.splice(i, 1);
    }
  }
}
