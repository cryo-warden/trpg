import type { Resource } from "../src/Resource";
import { action } from "./action";
import { baseline } from "./baseline";
import { trait } from "./trait";

export const prototypeResource = {
  actionRecord: action,
  baselineRecord: baseline,
  traitRecord: trait,
} as const satisfies Resource<any>;
