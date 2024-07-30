import { addComponent, defineQuery, IWorld } from "bitecs";
import { createSystemOfQuery } from "bitecs-helpers";
import { ComponentRecord } from "../componentRecord";

export const lifeAndDeathSystem = ({ Life, Death }: ComponentRecord) =>
  createSystemOfQuery(defineQuery([Life, Death]), (id, world: IWorld) => {
    if (Life.value[id] <= 0) {
      addComponent(world, Death, id);
    }
  });
