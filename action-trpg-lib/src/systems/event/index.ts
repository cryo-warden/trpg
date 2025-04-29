import observation from "./observation";
import resetObservers from "./resetObservers";
import resolve from "./resolve";

export const event = {
  observation,
  resetObservers,
  resolve,
} as const;
