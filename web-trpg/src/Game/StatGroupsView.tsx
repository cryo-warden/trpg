import { IntStatKey, STAT_GROUPS, statWithDelta } from "./statGroups";
import "./StatGroupsView.css";

/**
 * THE categorized detailed stats view — one component for every card
 * that lays a full stat block out (stance cards, the equip menu), so
 * they cannot drift apart in layout or rules. Compact by construction:
 * two stats per row per category. Deltas render only when non-zero
 * (and the equip menu, being the base stances compare to, passes none).
 */
export const StatGroupsView = ({
  statOf,
  deltaOf,
}: {
  statOf: (key: IntStatKey) => number;
  deltaOf?: (key: IntStatKey) => number;
}) => (
  <>
    {STAT_GROUPS.map((group) => (
      <div className="statGroup" key={group.label}>
        <h4>{group.label}</h4>
        <div className="totals">
          {group.stats.map(([key, label]) => (
            <div key={key}>
              {label} {statWithDelta(statOf(key), deltaOf?.(key) ?? 0)}
            </div>
          ))}
        </div>
      </div>
    ))}
  </>
);
