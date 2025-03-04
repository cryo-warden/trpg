import type { World } from "../World";

export default (world: World) => {
  const entities = world.with("status", "cdp");
  return () => {
    for (const entity of entities) {
      if (entity.cdp >= (entity.mhp ?? Infinity)) {
        entity.status.dead = true;
      }
    }
  };
};
