import { useEffect, useMemo } from "react";
import { WithEntity } from "./EntityComponent";
import { HPBar } from "./HPBar";
import { Panel } from "./Panel";
import { useEngine, WithEngine } from "./EngineContext";
import { updateWatchable, useWatchable } from "./useWatchable";
import { createEngine } from "action-trpg-lib";

import "./App.css";

const EntityPanel = WithEntity(({ entity }) => {
  useWatchable(entity);
  return (
    <Panel className="EntityPanel">
      <HPBar entity={entity} />
      <div>{JSON.stringify(entity)}</div>
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

  useEffect(() => {
    engine.world.add({ hp: 20, mhp: 20, cdp: 0 });
    engine.world.add({ hp: 3, mhp: 5, cdp: 1 });
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
            engine.world.add({ hp: 20, mhp: 20, cdp: 0 });
            engine.world.add({ hp: 15, mhp: 15, cdp: 0 });
            updateWatchable(engine);
          }}
        >
          add entity
        </button>
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
