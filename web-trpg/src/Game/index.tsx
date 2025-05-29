import { Panel } from "../structural/Panel";
import { WithDynamicPanel } from "./context/DynamicPanelContext";
import { WithStdb } from "./context/StdbContext";
import { WithTarget } from "./context/TargetContext";
import { DynamicPanel } from "./DynamicPanel";
import { EventsPanel } from "./EventsPanel";
import "./index.css";
import { SelfPanel } from "./SelfPanel";
import { TargetPanel } from "./TargetPanel";

export const Game = () => (
  <WithStdb>
    <WithDynamicPanel>
      <WithTarget>
        <div className="Game">
          <EventsPanel className="events" />
          <DynamicPanel className="dynamic" />
          <SelfPanel className="self" />
          <TargetPanel className="target" />
          <Panel className="queue">Queue</Panel>
        </div>
      </WithTarget>
    </WithDynamicPanel>
  </WithStdb>
);
