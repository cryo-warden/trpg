import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("status", "hp");
  return () => {
    for (const entity of entities) {
      if (entity.hp <= (entity.cdp ?? 0)) {
        entity.status.unconscious = true;
      }
    }
  };
};
