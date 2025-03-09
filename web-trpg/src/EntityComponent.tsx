import { Entity } from "action-trpg-lib";
import { ReactNode } from "react";

export type EntityComponent<T extends Entity = Entity> = ({
  entity,
}: {
  entity: T;
}) => ReactNode;
