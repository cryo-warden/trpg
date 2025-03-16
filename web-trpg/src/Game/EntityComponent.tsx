import { Entity } from "action-trpg-lib";
import { ReactNode } from "react";
import { useWatchable } from "../structural/useWatchable";

export type EntityComponent<T extends Entity = Entity> = ({
  entity,
}: {
  entity: T;
}) => ReactNode;

export const WithEntity = <
  const TProps extends {},
  T extends (props: TProps & { entity: Entity }) => any = (
    props: TProps & { entity: Entity }
  ) => ReactNode
>(
  Component: T
): T =>
  ((props) => {
    useWatchable(props.entity);
    const AnyComponent = Component as any;
    return <AnyComponent {...props} />;
  }) as T;
