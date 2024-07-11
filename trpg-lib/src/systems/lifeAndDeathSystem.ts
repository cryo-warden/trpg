import { defineQuery } from "bitecs";
import { createResourceSystem } from "bitecs-helpers";
import { Life } from "../components/Life";
import { Death } from "../components/Death";

export const lifeAndDeathSystem = createResourceSystem({
  query: defineQuery([Life, Death]),
  action: () => (id) => {
    if (Life.value[id] <= 0) {
      Death.isDead[id] = 1;
    }
  },
});
