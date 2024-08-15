import { Entity } from "./entity";

export class World<TResourceRecord extends Record<string, any>> {
  readonly entities: Entity[] = [];
  readonly resourceRecord: TResourceRecord;

  constructor(resourceRecord: TResourceRecord) {
    this.resourceRecord = resourceRecord;
  }
}
