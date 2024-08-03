import * as bitecs from "bitecs";
import { createEntitySerializer as createEntitySerializerWithBitEcs } from "bitecs-helpers";
import { ComponentRecord } from "./componentRecord";

export const createEntitySerializer = (componentRecord: ComponentRecord) =>
  createEntitySerializerWithBitEcs(bitecs, componentRecord);
