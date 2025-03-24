import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const observables = engine.world.with("observable");
  const observers = engine.world.with("observer");
  return () => {
    for (const entity of observables) {
      entity.observable = [];
    }
    for (const entity of observers) {
      entity.observer = [];
    }
  };
});
