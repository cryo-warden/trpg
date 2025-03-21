import { createSystem } from "../System";

export default createSystem((engine) => {
  const entities = engine.world.with("status", "cdp");
  return () => {
    for (const entity of entities) {
      if (entity.cdp >= (entity.mhp ?? Infinity)) {
        entity.status.dead = true;
      }
    }
  };
});
