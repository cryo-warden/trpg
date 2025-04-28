import { ReactNode } from "react";
import { Token } from "../structural/mutable";
import { useEngine } from "./context/EngineContext";
import { Entity } from "./trpg";

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
    // Use the entity id as a key to prevent state leakage when switching entities.
    const entityId = engine.world.id(props.entityToken.value);
    const AnyComponent = Component as any;
    return <AnyComponent key={entityId} {...props} />;
  }) as T;
