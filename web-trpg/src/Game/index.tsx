import { ReactNode } from "react";
import { AccountPanel } from "./AccountPanel";
import { AdminControls } from "./AdminControls";
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
import { StancePanel } from "./StancePanel";
import { FocusPanel } from "./FocusPanel";
import { FocusProvider } from "./context/FocusProvider";

/** No implicit accounts: an unattached connection sees only the account
 * screen; a provisional password blocks everything until rotated; an
 * attached account plays, and is prompted about pending logins. */
const AccountGate = ({ children }: { children: ReactNode }) => {
  const account = useMyAccount();
  if (account == null) {
    return <AccountPanel />;
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
            <StancePanel className="stances" />
            <PinnedActionsPanel className="pinned" />
          </div>
        </FocusProvider>
      </WithDynamicPanel>
    </AccountGate>
  </WithStdb>
);
