import { System, SystemArgs } from "./system";
import { World } from "./world";

export const world: World<{}> = {
  entities: [],
  resourceRecord: {},
};

const components = [] as const satisfies SystemArgs;

const iterate: System<typeof components> = (world, ...components) => {
  // console.log(world, components);
};

for (let i = 0; i < 100; ++i) {
  iterate(world);
}
