declare const ENTITY_MARK: unique symbol;

export type Entity = number & { [ENTITY_MARK]: true };
