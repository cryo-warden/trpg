import { Entity } from "action-trpg-lib";
import { ReactNode } from "react";
import { Token, useToken } from "../structural/mutable";
import { useEngine } from "./context/EngineContext";

export type EntityComponent<T extends Entity = Entity> = ({
  entity,
}: {
  entity: T;
}) => ReactNode;

export const WithEntity = <
  const TProps extends {},
  T extends (props: TProps & { entityToken: Token<Entity> }) => any = (
    props: TProps & { entityToken: Token<Entity> }
  ) => ReactNode
>(
  Component: T
): T =>
  ((props) => {
    const engine = useEngine();
    const entityId = engine.world.id(props.entityToken.value);
    const AnyComponent = Component as any;
    return <AnyComponent key={entityId} {...props} />;
  }) as T;
