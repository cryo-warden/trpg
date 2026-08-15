import {
  IntStats,
  signedStatSummary,
  totalStatSummary,
} from "./domain/statSummary";
import "./StatBlockSummary.css";

/**
 * THE stat-block summary element: the non-zero elements of a block, as
 * one compact line. Deltas render signed ("+2 mhp, -1 gait"); totals
 * render plain ("mhp 12, gait 2"). Every surface that summarizes a
 * block — entity cards, stance cards, the loadout menu — renders this,
 * never its own formatting. (Event narration shares the same domain
 * functions through the language plugins.)
 */
export const StatBlockSummary = ({
  statBlock,
  totals = false,
}: {
  statBlock: IntStats;
  totals?: boolean;
}) => {
  const text = totals
    ? totalStatSummary(statBlock)
    : signedStatSummary(statBlock);
  if (text === "") {
    return null;
  }
  return <span className="StatBlockSummary">{text}</span>;
};
