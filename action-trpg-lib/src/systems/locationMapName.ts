import { createSystem } from "./createSystem";

export default createSystem((engine) => {
  const entities = engine.world.with("location");
  return () => {
    for (const entity of entities) {
      if (entity.location.locationMapName != null) {
        engine.world.addComponent(
          entity,
          "locationMapName",
          entity.location.locationMapName
        );
        entity.locationMapName = entity.location.locationMapName;
      }
    }
  };
});
