import { ActionId } from "../Game/trpg";
import { EntityEvent } from "../stdb/types";
import {
  createNarrationRenderValue,
  initialNarrationContext,
  Narration,
  NarrationContext,
} from "../Game/domain/narration";
import { signedStatSummary } from "../Game/domain/statSummary";
import { CreateLanguage } from "./language";

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

export const createEnUs: CreateLanguage<NarrationContext> = ({
  actionAppearanceOf,
}) => {
  // A KNOWN action without a beginTemplate is deliberately silent at
  // start: instant deeds (equip, unequip) narrate once, at the effect —
  // never the same sentence twice. Unknown actions keep the mysterious
  // default.
  const getActionTemplate = (actionId: ActionId): string | null => {
    const appearance = actionAppearanceOf(actionId);
    if (appearance != null && appearance.beginTemplate == null) {
      return null;
    }
    return appearance?.beginTemplate ?? DEFAULT_ACTION_TEMPLATE;
  };

  // The sentence for an event, or null when the event is not narrated (e.g.
  // resting, or an effect kind with no player-facing description yet).
  const narrateEvent = (event: EntityEvent): Narration | null => {
  switch (event.eventType.tag) {
    case "StartAction": {
      const template = getActionTemplate(event.eventType.value);
      return template == null
        ? null
        : {
            template,
            values: [event.ownerEntityId, event.targetEntityId],
          };
    }
    // A deliberate act that came to nothing narrates its failure — never
    // a silent drop.
    case "ActionFailed":
      return {
        template: "{0:sentence:subject} tried, but nothing came of it.",
        values: [event.ownerEntityId],
      };
    // A queued action dropped because its target stopped being valid.
    case "TargetLost":
      return {
        template:
          "{0:sentence:subject} hesitated — {0:possessive} target was gone.",
        values: [event.ownerEntityId],
      };
    case "ActionEffect": {
      const owner = event.ownerEntityId;
      const target = event.targetEntityId;
      const effect = event.eventType.value;
      // The numbers ARE the juice: a stat-bearing event renders what moved.
      const statSuffix =
        event.statBlock != null ? signedStatSummary(event.statBlock) : "";
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
        case "Rearm":
          return {
            template: "{0:sentence:subject} shifted {0:possessive} grips.",
            values: [owner],
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
          return statSuffix !== ""
            ? {
                template: "{0:sentence:subject} readied {1:object} ({2}).",
                values: [owner, target, statSuffix],
              }
            : {
                template: "{0:sentence:subject} readied {1:object}.",
                values: [owner, target],
              };
        case "Unequip":
          return statSuffix !== ""
            ? {
                template: "{0:sentence:subject} put away {1:object} ({2}).",
                values: [owner, target, statSuffix],
              }
            : {
                template: "{0:sentence:subject} put away {1:object}.",
                values: [owner, target],
              };
        case "Eat":
          return statSuffix !== ""
            ? {
                template: "{0:sentence:subject} ate {1:object} ({2}).",
                values: [owner, target, statSuffix],
              }
            : {
                template: "{0:sentence:subject} ate {1:object}.",
                values: [owner, target],
              };
        default:
          // Buff and any future effect kinds are not narrated yet.
          return null;
      }
    }
    default:
      return null;
  }
  };

  return {
    narrateEvent,
    initialContext: initialNarrationContext,
    createRenderValue: createNarrationRenderValue,
  };
};
