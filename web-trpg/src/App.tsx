import { useEffect, useMemo } from "react";
import { WithEntity } from "./EntityComponent";
import { HPBar } from "./HPBar";
import { Panel } from "./Panel";
import { useEngine, WithEngine } from "./EngineContext";
import { updateWatchable, useWatchable } from "./useWatchable";
import {
  bindRootSystem,
  createEngine,
  Entity,
  updateEngine,
} from "action-trpg-lib";

import "./App.css";
import { usePeriodicEffect } from "./usePeriodicEffect";

const entities = [
  {
    name: "Human",
    hp: 5,
    mhp: 20,
    cdp: 0,
    actor: { attack: 0, actionState: null },
    controller: { type: "player", id: "me" },
    healingTaker: { accumulatedHealing: 0 },
    damageTaker: {
      accumulatedDamage: 0,
      defense: 0,
      criticalDamageThreshold: 3,
    },
    criticalDamageTaker: {
      accumulatedCriticalDamage: 0,
      criticalDefense: 0,
    },
  },
  {
    name: "Small Bat",
    hp: 3,
    mhp: 5,
    cdp: 3,
    healingTaker: { accumulatedHealing: 0 },
    actor: { actionState: null, attack: 0 },
    controller: { type: "sequence", sequence: [] },
  },
] satisfies Entity[];

const EntityPanel = WithEntity(({ entity }) => {
  useWatchable(entity);
  return (
    <Panel className="EntityPanel">
      <div>{entity.name}</div>
      <HPBar entity={entity} />
    </Panel>
  );
});

const EntitiesPanel = () => {
  const engine = useEngine();
  useWatchable(engine);
  const entities = engine.world.with("hp");
  return (
    <Panel>
      {Array.from(entities).map((entity, i) => {
        return <EntityPanel key={i} entity={entity} />;
      })}
    </Panel>
  );
};

const App = () => {
  const engine = useEngine();

  (window as any).dev = { engine, updateWatchable };

  usePeriodicEffect(
    () => {
      const system = bindRootSystem(engine);

      return () => {
        updateEngine(engine);
        system();
        updateWatchable(engine);
        for (const entity of engine.world.with()) {
          updateWatchable(entity);
        }
      };
    },
    1000,
    [engine]
  );

  useEffect(() => {
    for (const entity of entities) {
      engine.world.add(entity);
    }
    console.log("Adding initial entities.");
    updateWatchable(engine);
  }, [engine]);

  return (
    <div className="App">
      <Panel className="events">Events</Panel>
      <div className="entities">
        <EntitiesPanel />
      </div>
      <Panel className="self">
        <button
          onClick={() => {
            const withHP = engine.world.with("hp").entities;
            const entity = withHP[Math.floor(Math.random() * withHP.length)];
            entity.hp -= 5;
            if (entity.cdp != null) {
              entity.cdp += 1;
            }
            updateWatchable(entity);
          }}
        >
          damage entity
        </button>
      </Panel>
      <Panel className="target">Target</Panel>
      <Panel className="queue">Queue</Panel>
    </div>
  );
};

export default () => {
  const engine = useMemo(() => createEngine(), []);
  return (
    <WithEngine engine={engine}>
      <App />
    </WithEngine>
  );
};
