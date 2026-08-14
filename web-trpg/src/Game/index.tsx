import { ReactNode } from "react";
import { Panel } from "../structural/Panel";
import { AccountPanel } from "./AccountPanel";
import { AdminControls } from "./AdminControls";
import { AutoEntryPanel, resolveAutoEntry } from "./AutoEntry";
import { WithDynamicPanel } from "./context/WithDynamicPanel";
import { WithStdb } from "./context/StdbContext";
import { useMyAccount } from "./context/StdbContext/account";
import { DynamicPanel } from "./DynamicPanel";
import { EventsPanel } from "./EventsPanel";
import "./index.css";
import { LoginRequestsPrompt } from "./LoginRequestsPrompt";
import { PinnedActionsPanel } from "./PinnedActionsPanel";
import { RotatePasswordPanel } from "./RotatePasswordPanel";
import { SelfPanel } from "./SelfPanel";
import { FocusPanel } from "./FocusPanel";
import { FocusProvider } from "./context/FocusProvider";
import { TurnPauseOverlay } from "./TurnPauseOverlay";

/** No implicit accounts: an unattached connection sees only the account
 * screen; a provisional password blocks everything until rotated; an
 * attached account plays, and is prompted about pending logins. */
const AccountGate = ({ children }: { children: ReactNode }) => {
  const account = useMyAccount();
  const autoEntry = resolveAutoEntry();
  if (autoEntry.configurationError != null) {
    return (
      <Panel className="account">
        <div className="error">{autoEntry.configurationError}</div>
      </Panel>
    );
  }
  if (account == null) {
    return autoEntry.enabled ? <AutoEntryPanel /> : <AccountPanel />;
  }
  if (account.requiresPasswordRotation) {
    return <RotatePasswordPanel />;
  }
  return (
    <>
      <LoginRequestsPrompt />
      <AdminControls />
      {children}
    </>
  );
};

export const Game = () => (
  <WithStdb>
    <AccountGate>
      <WithDynamicPanel>
        <FocusProvider>
          <div className="Game">
            <EventsPanel className="events" />
            <DynamicPanel className="dynamic" />
            <SelfPanel className="self" />
            <FocusPanel className="focus" />
            <PinnedActionsPanel className="pinned" />
            <TurnPauseOverlay />
          </div>
        </FocusProvider>
      </WithDynamicPanel>
    </AccountGate>
  </WithStdb>
);
