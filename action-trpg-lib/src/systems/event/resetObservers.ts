import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const observers = engine.world.with("observer");
  return () => {
    for (const entity of observers) {
      entity.observer = [];
    }
  };
});
