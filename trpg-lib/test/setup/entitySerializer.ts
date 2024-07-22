import { createEntitySerializer } from "bitecs-helpers";
import * as bitecs from "bitecs";
import { ComponentRecord } from "../../src/componentRecord";

export const createEntitySerializerFromComponents = (
  componentRecord: ComponentRecord
) => createEntitySerializer(bitecs, componentRecord);
