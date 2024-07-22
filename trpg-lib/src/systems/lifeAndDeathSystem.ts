import { addComponent, defineQuery, IWorld } from "bitecs";
import { createResourceSystem } from "bitecs-helpers";
import { ComponentRecord } from "../components";

export const lifeAndDeathSystem = ({ Life, Death }: ComponentRecord) =>
  createResourceSystem({
    query: defineQuery([Life, Death]),
    action: () => (id, world: IWorld) => {
      if (Life.value[id] <= 0) {
        addComponent(world, Death, id);
      }
    },
  });
