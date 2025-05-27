import { ReactNode } from "react";
import { EntityId } from "./trpg";

export type EntityComponent = ({ entity }: { entity: EntityId }) => ReactNode;

export const WithEntity = <
  const TProps extends {},
  T extends (props: TProps & { entity: EntityId }) => any = (
    props: TProps & { entity: EntityId }
  ) => ReactNode
>(
  Component: T
): T =>
  ((props) => {
    // Use the entity id as a key to prevent state leakage when switching entities.
    const AnyComponent = Component as any;
    return <AnyComponent key={props.entity} {...props} />;
  }) as T;
