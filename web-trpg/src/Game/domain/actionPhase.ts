/**
 * An empty round must be VISIBLE: an entity sitting in a round with no
 * effects is either preparing (an effect round is still coming) or
 * recovering (all effect rounds are done). Framework-free so the UI and a
 * headless driver describe action phases identically.
 */

export type ActionRoundView = {
  sequenceIndex: number;
  hasEffects: boolean;
};

export type ActionPhase = "acting" | "preparing" | "recovering";

export const actionPhaseOf = ({
  sequenceIndex,
  rounds,
}: {
  sequenceIndex: number;
  rounds: ActionRoundView[];
}): ActionPhase => {
  const current = rounds.find((round) => round.sequenceIndex === sequenceIndex);
  if (current == null || current.hasEffects) {
    return "acting";
  }
  return rounds.some(
    (round) => round.sequenceIndex > sequenceIndex && round.hasEffects,
  )
    ? "preparing"
    : "recovering";
};
