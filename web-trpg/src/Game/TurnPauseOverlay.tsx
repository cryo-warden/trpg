import { useMyTurnPaused } from "./context/StdbContext/components";
import "./TurnPauseOverlay.css";

/** The presentational half: a small transient overlay that fades in
 * slowly while the turn waits and vanishes quickly the moment it fires
 * (the transition duration swaps with visibility). */
export const TurnPauseOverlayView = ({ paused }: { paused: boolean }) => (
  <div
    className={`TurnPauseOverlay${paused ? " visible" : ""}`}
    aria-hidden={!paused}
  >
    Time holds still, awaiting your move.
  </div>
);

export const TurnPauseOverlay = () => (
  <TurnPauseOverlayView paused={useMyTurnPaused()} />
);
