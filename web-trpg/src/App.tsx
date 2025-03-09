import { useEffect, useMemo, useState } from "react";
import { EntityComponent } from "./EntityComponent";
import { HPBar } from "./HPBar";
import { Panel } from "./Panel";
import {
  updateWatchable,
  useEngine,
  useWatchable,
  WithEngine,
} from "./EngineContext";
import { createEngine } from "action-trpg-lib";

import "./App.css";

const EntityPanel: EntityComponent = ({ entity }) => {
  useWatchable(entity);
  return (
    <Panel className="EntityPanel">
      <HPBar entity={entity} />
      <div>{JSON.stringify(entity)}</div>
    </Panel>
  );
};

const EntitiesPanel = () => {
  const engine = useEngine();
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
  useWatchable(engine);

  (window as any).dev = { engine, updateWatchable };

  useEffect(() => {
    engine.world.add({ hp: 20, mhp: 20, cdp: 0 });
    engine.world.add({ hp: 3, mhp: 5, cdp: 1 });
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
            engine.world.add({ hp: 20, mhp: 20, cdp: 0 });
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
