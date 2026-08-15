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

/**
 * The action-bar editor, shared by the stance cards and the equip menu's
 * DEFAULT bar: assigned actions in hotkey order, draggable to reorder, a
 * plain tap removes. Purely presentational — every edit proposes through
 * onAssign; whose bar it is (a stance's assignment, the default set) is
 * the caller's business.
 */

/** One assigned action in the bar. A raw button reusing the Button
 * styles — the structural Button's own click handling would fight the
 * drag listeners. */
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

/** dnd-kit's PointerSensor covers mouse AND touch through one path; the
 * 8px activation distance keeps plain taps registering as clicks
 * (remove). */
export const ActionsBarEditor = ({
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
