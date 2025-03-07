import { createEngine } from "action-trpg-lib";
import "./App.css";
import { Entity } from "action-trpg-lib/src/Entity";
import { ReactNode } from "react";

const Panel = ({ children }: { children: ReactNode }) => (
  <div className="Panel">{children}</div>
);

const Entities = ({ entities }: { entities: Entity[] }) => {
  return (
    <Panel>
      {entities.map((entity, i) => {
        return <div key={i}>{JSON.stringify(entity)}</div>;
      })}
    </Panel>
  );
};

const App = () => {
  const engine = createEngine();
  const entities = engine.world.with("hp");
  return (
    <div className="App">
      <div className="events">Events</div>
      <div className="entities">
        <Entities entities={Array.from(entities)} />
      </div>
      <div className="self">Self</div>
      <div className="target">Target</div>
      <div className="queue">Queue</div>
    </div>
  );
};

export default App;
