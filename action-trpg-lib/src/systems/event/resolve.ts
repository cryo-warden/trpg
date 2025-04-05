import type { Entity } from "../../Entity";
import type { EntityEvent } from "../../structures/EntityEvent";
import { applyStatusEffectMap } from "../../structures/StatusEffectMap";
import { createSystem } from "../createSystem";

export default createSystem((engine) => {
  const unlocatedSelfObservers = engine.world
    .with("events", "observer")
    .without("location");
  const locatedObservers = engine.world.with("location", "observer");
  const locatedEventHavers = engine.world.with("location", "events");

  const eventHavers = engine.world.with("events");

  return () => {
    for (const entity of unlocatedSelfObservers) {
      // Allow self observation even without location.
      entity.observer.push(...entity.events);
    }

    const locationEventsMap = new Map<Entity, EntityEvent[]>();
    for (const entity of locatedEventHavers) {
      if (!locationEventsMap.has(entity.location)) {
        locationEventsMap.set(entity.location, []);
      }
      locationEventsMap.get(entity.location)!.push(...entity.events);
    }

    for (const entity of locatedObservers) {
      const events = locationEventsMap.get(entity.location);
      if (events == null) {
        continue;
      }
      entity.observer.push(...events);
    }

    for (const entity of eventHavers) {
      const { events } = entity;
      // Any new events triggered during resolution will wait for the next pass.
      // Also, if anything goes wrong, events will fail to resolve rather than resolve repeatedly.
      engine.world.removeComponent(entity, "events");
      for (const event of events) {
        switch (event.type) {
          case "action": {
            break;
          }
          case "damage": {
            if (event.damage > 0) {
              engine.world.addComponent(event.target, "accumulatedDamage", 0);
              event.target.accumulatedDamage! += event.damage;
            }
            if (event.criticalDamage > 0) {
              engine.world.addComponent(
                event.target,
                "accumulatedCriticalDamage",
                0
              );
              event.target.accumulatedCriticalDamage! += event.criticalDamage;
            }
            break;
          }
          case "dead": {
            engine.world.addComponent(event.source, "dead", true);
            break;
          }
          case "heal": {
            engine.world.addComponent(event.target, "accumulatedHealing", 0);
            event.target.accumulatedHealing! += event.heal;
            break;
          }
          case "status": {
            applyStatusEffectMap(engine, event.target, event.statusEffectMap);
            break;
          }
          case "unconscious": {
            engine.world.addComponent(event.source, "unconscious", true);
            break;
          }
        }
      }
    }
  };
});
