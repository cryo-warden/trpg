import { Types } from "bitecs";

type Types =
  | (typeof Types)[keyof typeof Types]
  | readonly [(typeof Types)[keyof typeof Types], number];

export type AsTsType<T extends Types> = T extends readonly [any, infer N]
  ? number[] & { length: N }
  : number;

export { Types };
