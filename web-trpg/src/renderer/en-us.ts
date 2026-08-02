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
 * The English (en-US) language plugin.
 *
 * English is the reference language: its sentence templates lean on the English
 * strings embedded directly in the game assets (`actions[id].appearance`). In
 * general a language will need its own vocabulary picker, but for now every
 * language leverages these English embeddings to move faster — and English will
 * live in the assets permanently, because English is the debugging language.
 *
 * Framework-free: this file names no rendering target. It is driven to React or
 * plain text purely by which {@link ../markup.Markup} the caller injects.
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

export const enUs: Language<NarrationContext> = {
  narrateEvent,
  initialContext: initialNarrationContext,
  createRenderValue: createNarrationRenderValue,
};
