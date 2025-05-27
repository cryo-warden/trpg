import { Entity } from "../stdb";

// TODO Handle loading resources here.
export const createEngine = () => {
  // WIP
  return {} as any;
};

export type Engine = ReturnType<typeof createEngine>;
export type Resource = any;
export type ActionName = string;
export type Action = any;
export type PlayerController = any;
export type EntityEvent = any;

export type EntityId = Entity["id"];
