import { actions } from "../Game/assets";
import { ActionId } from "../Game/trpg";
import { EntityEvent } from "../stdb/types";
import {
  createNarrationRenderValue,
  initialNarrationContext,
  Narration,
  NarrationContext,
} from "../Game/domain/narration";
import { Language } from "./language";

/**
 * The debug language plugin.
 *
 * This is INTENTIONALLY a separate copy of the English ({@link ./en-us.enUs})
 * language, not a re-export of it. The two are identical today, but they are
 * kept apart on purpose because this is a seam where we expect deliberate
 * drift: the debug language is where we would add extra logging, and where we
 * may choose to render a glut of diagnostic information into the output that
 * would never belong in a player-facing language. Sharing the code would make
 * that drift a refactor; copying it makes it a local edit.
 *
 * Like every language for now, it leverages the English strings embedded in the
 * game assets — English is the debugging language, so it stays in the assets
 * permanently.
 *
 * Framework-free: driven to React or plain text purely by the injected
 * {@link ../markup.Markup}.
 */

const DEFAULT_ACTION_TEMPLATE =
  "{0:sentence:subject} began a mysterious action toward {1:object}.";

const getActionTemplate = (actionId: ActionId): string =>
  actions[actionId]?.appearance.beginTemplate ?? DEFAULT_ACTION_TEMPLATE;

/**
 * The sentence for an event, or null when the event is not narrated (e.g.
 * resting, or an effect kind with no player-facing description yet).
 */
const narrateEvent = (event: EntityEvent): Narration | null => {
  switch (event.eventType.tag) {
    case "StartAction":
      return {
        template: getActionTemplate(event.eventType.value),
        values: [event.ownerEntityId, event.targetEntityId],
      };
    case "ActionEffect": {
      const owner = event.ownerEntityId;
      const target = event.targetEntityId;
      const effect = event.eventType.value;
      switch (effect.tag) {
        case "Attack":
          return {
            template: "{0:sentence:subject} dealt {2} damage to {1:object}!",
            values: [owner, target, effect.value.toString()],
          };
        case "Heal":
          return {
            template: "{0:sentence:subject} healed {1:object} for {2}.",
            values: [owner, target, effect.value.toString()],
          };
        case "Move":
          return {
            template: "{0:sentence:subject} moved through {1:object}.",
            values: [owner, target],
          };
        case "Take":
          return {
            template: "{0:sentence:subject} took {1:object}.",
            values: [owner, target],
          };
        case "Drop":
          return {
            template: "{0:sentence:subject} dropped {1:object}.",
            values: [owner, target],
          };
        case "Equip":
          return {
            template: "{0:sentence:subject} equipped {1:object}.",
            values: [owner, target],
          };
        case "Unequip":
          return {
            template: "{0:sentence:subject} unequipped {1:object}.",
            values: [owner, target],
          };
        default:
          // Rest, Buff, and any future effect kinds are not narrated yet.
          return null;
      }
    }
    default:
      return null;
  }
};

export const debug: Language<NarrationContext> = {
  narrateEvent,
  initialContext: initialNarrationContext,
  createRenderValue: createNarrationRenderValue,
};
