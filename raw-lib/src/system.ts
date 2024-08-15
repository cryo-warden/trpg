import { Component } from "./component";
import { World } from "./world";

export type SystemArgs = readonly Component[];

export type System<TComponents extends SystemArgs = SystemArgs> = (
  world: World<{}>,
  ...components: [...TComponents]
) => void;
