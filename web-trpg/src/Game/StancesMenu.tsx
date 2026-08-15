import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMemo, useRef, useState } from "react";
import type { StatBlock } from "../stdb/types";
import { Button } from "../structural/Button";
import "./StancesMenu.css";
import {
  useStanceDetailRows,
  useStanceReachabilityGraph,
} from "./context/StdbContext/assetLookup";
import {
  useMyActiveStanceId,
  usePlayerEntity,
  useTotalStatBlockComponent,
} from "./context/StdbContext/components";
import { assetInstanceIsOn, toggledAssetIds } from "./domain/countedAssets";
import {
  OwnedItem,
  useArmamentStatBlocks,
  useGearStatBlockOf,
  useMyDefaultArmamentIds,
  useMyEquipmentArmamentIds,
  useMyStanceAssignments,
  useOwnedItems,
} from "./context/StdbContext/loadout";
import { useStdbConnection } from "./context/StdbContext/useStdb";
import { useTableData } from "./context/StdbContext/useTableData";
import { reachableStanceIds } from "./domain/stanceReachability";
import { ACTION_APPEARANCES, ActionName } from "./assets/actions";
import { signedStatSummary } from "./domain/statSummary";
import { StatBlockSummary } from "./StatBlockSummary";

/** Every int stat of the block (the id-vec grants are not numbers). */
type IntStatKey = Exclude<keyof StatBlock, "actionIds" | "appearanceFeatureIds">;

type StatEntry = readonly [IntStatKey, string];

type StatGroup = { label: string; stats: readonly StatEntry[] };

const STAT_GROUPS: readonly StatGroup[] = [
  {
    label: "Combat",
    stats: [
      ["attack", "Attack"],
      ["defense", "Defense"],
      ["morale", "Morale"],
    ],
  },
  {
    label: "Pools",
    stats: [
      ["mhp", "Max HP"],
      ["mep", "Max EP"],
    ],
  },
  {
    label: "Body",
    stats: [
      ["hand", "Hand"],
      ["gait", "Gait"],
      ["reach", "Reach"],
      ["wing", "Wing"],
      ["upright", "Upright"],
      ["size", "Size"],
    ],
  },
  {
    label: "Armament",
    stats: [
      ["blunt", "Blunt"],
      ["bladed", "Bladed"],
      ["pole", "Pole"],
      ["ward", "Ward"],
      ["focus", "Focus"],
    ],
  },
];

const ALL_STATS: readonly StatEntry[] = STAT_GROUPS.flatMap(
  (group) => group.stats,
);

/** The parenthesized delta against the no-stance value: always shown, so
 * like-for-like reads at a glance ("Hand 1 (-1)"). */
const deltaText = (delta: number): string =>
  delta > 0 ? `+${delta}` : `${delta}`;

/** One assigned action in the bar: draggable to reorder (position is the
 * hotkey), a plain tap removes it. A raw button reusing the Button styles
 * — the structural Button's own click handling would fight the drag
 * listeners. */
const SortableActionChip = ({
  id,
  label,
  onRemove,
}: {
  id: string;
  label: string;
  onRemove: () => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        "Button",
        "active",
        "interesting",
        "actionChip",
        isDragging ? "dragging" : "",
      ].join(" ")}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        touchAction: "none",
      }}
      onClick={onRemove}
      {...attributes}
      {...listeners}
    >
      {label}
    </button>
  );
};

/** The stance's bar: its assigned actions in hotkey order. dnd-kit's
 * PointerSensor covers mouse AND touch through one path; the 8px
 * activation distance keeps plain taps registering as clicks (remove). */
const StanceActionsBar = ({
  assignedActionIds,
  nameOf,
  onAssign,
}: {
  assignedActionIds: number[];
  nameOf: (actionId: number) => string;
  onAssign: (actionIds: number[]) => void;
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={({ active, over }) => {
        if (over == null || active.id === over.id) {
          return;
        }
        const from = assignedActionIds.findIndex(
          (id) => String(id) === active.id,
        );
        const to = assignedActionIds.findIndex((id) => String(id) === over.id);
        if (from < 0 || to < 0) {
          return;
        }
        onAssign(arrayMove(assignedActionIds, from, to));
      }}
    >
      <SortableContext
        items={assignedActionIds.map(String)}
        strategy={rectSortingStrategy}
      >
        <div className="actionBar">
          {assignedActionIds.map((actionId, index) => (
            <SortableActionChip
              key={actionId}
              id={String(actionId)}
              label={`${(index + 1) % 10} ${nameOf(actionId)}`}
              onRemove={() =>
                onAssign(assignedActionIds.filter((id) => id !== actionId))
              }
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

/**
 * The standalone stances menu: one card per REACHABLE stance. There is no
 * "known stances" state anywhere — reachability (the closure from the
 * player's granted actions and carried items' grants) IS availability,
 * here and in the server's adoption gate. Cards snap-scroll horizontally,
 * each free to scroll vertically on its own. A card leads with the FULL
 * stat totals the player would have in that stance with its assigned
 * loadout, then assigns its armaments — the actions the stance will fight
 * with. Armament assignments to the ACTIVE stance equip and unequip
 * automatically (hands and configuration never disagree about the stance
 * you are in); other stances' assignments — and every ACTION assignment —
 * take effect when a stance change pays its round.
 */
export const StancesMenu = () => {
  const connection = useStdbConnection();
  const playerEntity = usePlayerEntity();
  const total = useTotalStatBlockComponent(playerEntity);
  const activeStanceId = useMyActiveStanceId();
  const stanceRows = useStanceDetailRows();
  const graph = useStanceReachabilityGraph();
  const assignments = useMyStanceAssignments();
  const owned = useOwnedItems();
  const gearStatBlockOf = useGearStatBlockOf();
  const equippedArmamentIds = useMyEquipmentArmamentIds();
  const defaultArmamentIds = useMyDefaultArmamentIds();
  const armamentStats = useArmamentStatBlocks();
  const actionNames = useTableData(
    "actions",
    (table) =>
      new Map<number, string>([...table.iter()].map((row) => [row.id, row.name])),
    [],
  );
  // Buttons render PROPER names, never the internal underscored key: the
  // subscribed table's raw name resolves through the client vocabulary.
  const actionDisplayName = (actionId: number): string => {
    const raw = actionNames.get(actionId);
    if (raw == null) {
      return `#${actionId}`;
    }
    return raw in ACTION_APPEARANCES
      ? ACTION_APPEARANCES[raw as ActionName].displayName
      : raw;
  };

  const totalStatBlock = total?.statBlock ?? null;
  const reachable = useMemo(() => {
    const seedActionIds = [...(totalStatBlock?.actionIds ?? [])];
    for (const item of owned) {
      const gear = gearStatBlockOf(item);
      if (gear != null) {
        seedActionIds.push(...gear.actionIds);
      }
    }
    // The stance currently HELD is trivially reachable — even one adopted
    // by force or at creation, with no posture action granting it.
    const seedStanceIds = activeStanceId == null ? [] : [activeStanceId];
    return new Set(reachableStanceIds({ seedActionIds, seedStanceIds, graph }));
  }, [totalStatBlock, owned, gearStatBlockOf, graph, activeStanceId]);
  const shown = stanceRows.filter((row) => reachable.has(row.id));

  // The stance-free, armament-free base of EVERY stat: the total includes
  // the active stance and the equipment actually in hand, so peel both
  // back off. Each card then shows the FULL TOTALS the player would have
  // in that stance with its assigned loadout. (The server revalidates
  // against the true base on every assignment; these numbers only inform.)
  const activeStanceBlock =
    stanceRows.find((row) => row.id === activeStanceId)?.statBlock ?? null;
  const armamentStatSum = (armamentIds: number[], key: IntStatKey): number =>
    armamentIds.reduce(
      (sum, id) => sum + (armamentStats.get(id)?.[key] ?? 0),
      0,
    );
  const baseStats = Object.fromEntries(
    ALL_STATS.map(([key]) => [
      key,
      (totalStatBlock?.[key] ?? 0) -
        (activeStanceBlock?.[key] ?? 0) -
        armamentStatSum(equippedArmamentIds, key),
    ]),
  ) as Record<IntStatKey, number>;

  // The base ACTION grants, mirroring baseStats: the published total minus
  // the active stance's grants and the in-hand armaments' grants.
  const baseActionIds = (() => {
    const ids = new Set(totalStatBlock?.actionIds ?? []);
    for (const id of activeStanceBlock?.actionIds ?? []) {
      ids.delete(id);
    }
    for (const armamentId of equippedArmamentIds) {
      for (const id of armamentStats.get(armamentId)?.actionIds ?? []) {
        ids.delete(id);
      }
    }
    return [...ids];
  })();

  const ownedArmaments = owned.filter((item) => item.kind === "Armament");

  // Gallery indicators: one dot per card; the leading (snapped) card is
  // the current one. Cards are narrower than the strip on wide screens,
  // so several show at once — the dots track the strip's leading edge.
  const cardsRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cardElements = (): HTMLElement[] =>
    cardsRef.current == null
      ? []
      : ([...cardsRef.current.querySelectorAll(".stanceCard")] as HTMLElement[]);
  const handleScroll = () => {
    const strip = cardsRef.current;
    if (strip == null) {
      return;
    }
    let nearest = 0;
    let nearestDistance = Infinity;
    cardElements().forEach((card, index) => {
      const distance = Math.abs(card.offsetLeft - strip.scrollLeft);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = index;
      }
    });
    setCurrentIndex(nearest);
  };
  const scrollToIndex = (index: number) => {
    const strip = cardsRef.current;
    const card = cardElements()[index];
    if (strip == null || card == null) {
      return;
    }
    strip.scrollTo?.({ left: card.offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="StancesMenu">
      <div className="cards" ref={cardsRef} onScroll={handleScroll}>
        {shown.map((stance) => {
        const loadout = assignments.find((a) => a.stanceId === stance.id);
        // INTENT IS EXPLICIT in the loadout: null = no override / no bar
        // assignment; [] = deliberately bare hands / a deliberately blank
        // bar.
        const armamentOverride = loadout?.armamentIds ?? null;
        const barAssignment = loadout?.actionIds ?? null;
        const usesDefault = armamentOverride == null;
        const resolvedArmaments = armamentOverride ?? defaultArmamentIds;
        const assignedActions = barAssignment ?? [];
        const candidate = Object.fromEntries(
          ALL_STATS.map(([key]) => [
            key,
            baseStats[key] +
              stance.statBlock[key] +
              armamentStatSum(resolvedArmaments, key),
          ]),
        ) as Record<IntStatKey, number>;
        const freeHand = candidate.hand;
        const grantedActionNames = [...stance.statBlock.actionIds].map(
          (id) => actionDisplayName(id),
        );
        // The stance's candidate ACTION pool: base grants (the total minus
        // the active stance's and in-hand armaments' grants) plus this
        // stance's grants plus its assigned armaments' grants. Assigning
        // picks the pinned bar this stance carries in, in hotkey order.
        const poolActionIds = [
          ...new Set([
            ...baseActionIds,
            ...stance.statBlock.actionIds,
            ...resolvedArmaments.flatMap((id) => [
              ...(armamentStats.get(id)?.actionIds ?? []),
            ]),
          ]),
        ];
        // Highlighting always shows the EFFECTIVE set: the override when
        // one exists, the default items otherwise. Clicking an item while
        // on defaults copy-on-writes the visible set into a new override.
        const isOn = (item: OwnedItem) =>
          assetInstanceIsOn({
            ids: resolvedArmaments,
            item,
            items: ownedArmaments,
          });
        return (
          <section className="stanceCard" key={stance.id}>
            <h3>
              {stance.name}
              {stance.id === activeStanceId && " (active)"}
            </h3>
            {signedStatSummary(stance.statBlock) !== "" && (
              <div className="stanceSummary">
                <StatBlockSummary statBlock={stance.statBlock} />
              </div>
            )}
            {STAT_GROUPS.map((group) => (
              <div className="statGroup" key={group.label}>
                <h4>{group.label}</h4>
                <div className="totals">
                  {group.stats.map(([key, label]) => (
                    <div key={key}>
                      {label} {candidate[key]} (
                      {deltaText(candidate[key] - baseStats[key])})
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {grantedActionNames.length > 0 && (
              <div>Grants: {grantedActionNames.join(", ")}</div>
            )}
            <h4>Armaments (free hand: {freeHand})</h4>
            <Button
              className={usesDefault ? "active" : ""}
              interesting={usesDefault}
              onClick={() =>
                // A true toggle: on defaults, clicking moves to a CUSTOM
                // set with nothing assigned yet (Some([]) — deliberately
                // bare hands); on an override, clicking returns to the
                // default set (None).
                connection.reducers.assignStanceArmaments({
                  stanceId: stance.id,
                  armamentIds: usesDefault ? [] : undefined,
                })
              }
            >
              use default
            </Button>
            {ownedArmaments.map((item) => {
              const itemHand = armamentStats.get(item.assetId)?.hand ?? 0;
              const on = isOn(item);
              return (
                <Button
                  key={item.entityId.toString()}
                  className={on ? "active" : ""}
                  interesting={on}
                  disabled={!on && freeHand + itemHand < 0}
                  onClick={() =>
                    connection.reducers.assignStanceArmaments({
                      stanceId: stance.id,
                      armamentIds: toggledAssetIds({
                        ids: resolvedArmaments,
                        item,
                        items: ownedArmaments,
                      }),
                    })
                  }
                >
                  {item.name}
                </Button>
              );
            })}
            {ownedArmaments.length === 0 && <div>Nothing carried to wield.</div>}
            <h4>
              Actions ({assignedActions.length}/10)
              {barAssignment == null && " — bar unchanged on entry"}
            </h4>
            <StanceActionsBar
              assignedActionIds={assignedActions}
              nameOf={actionDisplayName}
              onAssign={(actionIds) =>
                connection.reducers.assignStanceActions({
                  stanceId: stance.id,
                  actionIds,
                })
              }
            />
            {poolActionIds
              .filter((actionId) => !assignedActions.includes(actionId))
              .map((actionId) => (
                <Button
                  key={actionId}
                  disabled={assignedActions.length >= 10}
                  onClick={() =>
                    connection.reducers.assignStanceActions({
                      stanceId: stance.id,
                      actionIds: [...assignedActions, actionId],
                    })
                  }
                >
                  {actionDisplayName(actionId)}
                </Button>
              ))}
          </section>
        );
        })}
      </div>
      <div className="dots">
        {shown.map((stance, index) => (
          <button
            key={stance.id}
            type="button"
            aria-label={stance.name}
            title={stance.name}
            className={[
              index === currentIndex ? "current" : "",
              stance.id === activeStanceId ? "activeStance" : "",
            ].join(" ")}
            onClick={() => scrollToIndex(index)}
          />
        ))}
      </div>
    </div>
  );
};
