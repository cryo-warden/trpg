import { ReactNode } from "react";
import { Panel } from "../structural/Panel";
import { AccountPanel } from "./AccountPanel";
import { WithDynamicPanel } from "./context/WithDynamicPanel";
import { WithStdb } from "./context/StdbContext";
import { useMyAccountId } from "./context/StdbContext/account";
import { DynamicPanel } from "./DynamicPanel";
import { EventsPanel } from "./EventsPanel";
import "./index.css";
import { LoginRequestsPrompt } from "./LoginRequestsPrompt";
import { SelfPanel } from "./SelfPanel";
import { TargetPanel } from "./TargetPanel";
import { TargetProvider } from "./context/TargetProvider";

/** No implicit accounts: an unattached connection sees only the account
 * screen; an attached one plays, and is prompted about pending logins. */
const AccountGate = ({ children }: { children: ReactNode }) => {
  const accountId = useMyAccountId();
  if (accountId == null) {
    return <AccountPanel />;
  }
  return (
    <>
      <LoginRequestsPrompt />
      {children}
    </>
  );
};

export const Game = () => (
  <WithStdb>
    <AccountGate>
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
    </AccountGate>
  </WithStdb>
);
