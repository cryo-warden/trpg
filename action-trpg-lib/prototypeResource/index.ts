import { type Resource } from "../src/Resource";
import { actionRecord } from "./actionRecord";
import { baselineRecord } from "./baselineRecord";
import { mapThemeRecord } from "./mapThemeRecord";
import { prefabEntityRecord } from "./prefabEntityRecord";
import { traitRecord } from "./traitRecord";

export const prototypeResource = {
  actionRecord,
  baselineRecord,
  mapThemeRecord,
  prefabEntityRecord,
  traitRecord,
} as const satisfies Resource<any>;
