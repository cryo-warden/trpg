import { World } from "miniplex";
import { Entity } from "./entity";

export const createWorld = () => new World<Entity>();
