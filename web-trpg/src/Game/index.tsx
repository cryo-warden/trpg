import { Panel } from "../structural/Panel";
import { WithDynamicPanel } from "./context/WithDynamicPanel";
import { WithStdb } from "./context/StdbContext";
import { DynamicPanel } from "./DynamicPanel";
import { EventsPanel } from "./EventsPanel";
import "./index.css";
import { SelfPanel } from "./SelfPanel";
import { TargetPanel } from "./TargetPanel";
import { TargetProvider } from "./context/TargetProvider";

export const Game = () => (
  <WithStdb>
    <WithDynamicPanel>
      <TargetProvider>
        <div className="Game">
          <EventsPanel className="events" />
          <DynamicPanel className="dynamic" />
          <SelfPanel className="self" />
          <TargetPanel className="target" />
          <Panel className="queue">Queue</Panel>
        </div>
      </TargetProvider>
    </WithDynamicPanel>
  </WithStdb>
);
