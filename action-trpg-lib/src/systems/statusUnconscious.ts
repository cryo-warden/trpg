import { createSystem } from "../System";

export default createSystem((engine) => {
  const entities = engine.world.with("status", "hp");
  return () => {
    for (const entity of entities) {
      if (entity.hp <= (entity.cdp ?? 0)) {
        entity.status.unconscious = true;
      }
    }
  };
});
