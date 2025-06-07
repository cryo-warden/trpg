import type { ReactNode } from "react";
import "./debug.css";
import {
  AppearanceFeature,
  AppearanceFeaturesComponent,
  EntityEvent,
  AllegianceComponent,
} from "../stdb";
import { EntityId } from "../Game/trpg";
import { renderTemplate, RenderValue } from "./template";

export const bindRenderer = ({
  appearanceFeatures,
  appearanceFeaturesComponents,
  allegianceComponents,
}: {
  appearanceFeatures: AppearanceFeature[];
  appearanceFeaturesComponents: AppearanceFeaturesComponent[];
  allegianceComponents: AllegianceComponent[];
}) => {
  const idToAppearanceFeature = new Map(
    appearanceFeatures.map((b) => [b.id, b])
  );
  const entityIdToAppearanceFeaturesComponent = new Map(
    appearanceFeaturesComponents.map((b) => [b.entityId, b])
  );
  const entityIdToAllegianceComponent = new Map(
    allegianceComponents.map((a) => [a.entityId, a])
  );
  const entityIdToName = (entityId: EntityId): string => {
    const appearanceFeaturesComponent =
      entityIdToAppearanceFeaturesComponent.get(entityId);

    if (appearanceFeaturesComponent == null) {
      return "something";
    }

    const appearanceFeatures = appearanceFeaturesComponent.appearanceFeatureIds
      .map((id) => idToAppearanceFeature.get(id))
      .filter((af) => af != null);

    const noun =
      appearanceFeatures
        .filter((af) => af.appearanceFeatureType.tag === "Noun")
        .toSorted((a, b) => a.priority - b.priority)[0]?.text ?? "something";

    const adjectives = appearanceFeatures
      .filter((af) => af.appearanceFeatureType.tag === "Adjective")
      .toSorted((a, b) => a.priority - b.priority)
      .slice(0, 3);

    return (adjectives.length > 0 ? adjectives.join(", ") + " " : "") + noun;
  };

  const entityIdToAllegianceId = (entityId: EntityId): EntityId | null => {
    return (
      entityIdToAllegianceComponent.get(entityId)?.allegianceEntityId ?? null
    );
  };

  const getName = (
    viewpointEntityId: EntityId,
    namedEntityId: EntityId | string | undefined,
    subjectEntityId?: EntityId | string | undefined
  ): string | null => {
    if (namedEntityId == null) {
      return null;
    }
    if (typeof namedEntityId === "string") {
      return namedEntityId;
    }
    if (viewpointEntityId === namedEntityId) {
      if (subjectEntityId === namedEntityId) {
        return "yourself";
      } else {
        return "you";
      }
    }
    return entityIdToName(namedEntityId);
  };

  type RenderContext = {
    subject: null | EntityId;
    object: null | EntityId;
  };

  const renderValue =
    (
      viewpointEntityId: EntityId
    ): RenderValue<EntityId | ReactNode, RenderContext> =>
    (value, ruleSet, context) => {
      if (typeof value === "bigint") {
        const nextContext = ruleSet.has("subject")
          ? { ...context, subject: value }
          : ruleSet.has("object")
          ? { ...context, object: value }
          : context;

        const postProcess = ruleSet.has("sentence")
          ? capitalize
          : (v: string) => v;
        return [
          <span className={getClassName(viewpointEntityId, value)}>
            {postProcess(
              getName(
                viewpointEntityId,
                value,
                ruleSet.has("object") ? context.subject ?? void 0 : void 0
              ) ?? ""
            )}
          </span>,
          {
            ...nextContext,
            object: ruleSet.has("sentence") ? null : nextContext.object,
          },
        ];
      }

      return [value, context];
    };

  // TODO Cache `renderTemplate(renderValue(viewpointEntity))(template)`
  const renderWithTemplate =
    (template: string) =>
    (viewpointEntity: EntityId) =>
    (values: (EntityId | ReactNode)[]) =>
      (
        <div className="debug renderer">
          {renderTemplate(renderValue(viewpointEntity))(template)(values, {
            object: null,
            subject: null,
          })}
        </div>
      );

  const capitalize = (word: string) =>
    word.substring(0, 1).toUpperCase() + word.substring(1);

  const getClassName = (
    viewpointEntity: EntityId,
    entity: EntityId | string | undefined
  ) => {
    if (entity == null || typeof entity === "string") {
      return "";
    }
    const viewpointAllegianceId = entityIdToAllegianceId(viewpointEntity);
    const entityAllegianceId = entityIdToAllegianceId(entity);
    if (viewpointAllegianceId == null || entityAllegianceId == null) {
      return "neutral";
    }
    if (viewpointAllegianceId === entityAllegianceId) {
      return "friendly";
    }
    return "hostile";
  };

  // WIP Render the new event format.
  const renderAction = (
    viewpointEntity: EntityId,
    { ownerEntityId, targetEntityId }: EntityEvent
  ): ReactNode => {
    return renderWithTemplate("{0:sentence:subject} began to {2} {1:object}.")(
      viewpointEntity
    )([ownerEntityId, targetEntityId, "do something to"]);
  };

  const renderEvent = (
    viewpointEntity: EntityId,
    event: EntityEvent
  ): ReactNode => {
    switch (event.eventType.tag) {
      case "StartAction":
        return renderAction(viewpointEntity, event);
      case "ActionEffect":
        switch (event.eventType.value.tag) {
          case "Rest":
            return null;
          case "Attack":
            return renderWithTemplate(
              "{0:sentence:subject} dealt {2} damage to {1:object}!"
            )(viewpointEntity)([
              event.ownerEntityId,
              event.targetEntityId,
              event.eventType.value.value.toString(),
            ]);
          // case "dead":
          //   return renderSentence({
          //     viewpointEntity,
          //     subject: event.source,
          //     verb: "died",
          //     finalPunctuation: "!",
          //   });
          case "Drop":
            return renderWithTemplate(
              "{0:sentence:subject} dropped {1:object}."
            )(viewpointEntity)([event.ownerEntityId, event.targetEntityId]);
          case "Equip":
            return renderWithTemplate(
              "{0:sentence:subject} equipped {1:object}."
            )(viewpointEntity)([event.ownerEntityId, event.targetEntityId]);
          case "Heal":
            return renderWithTemplate(
              "{0:sentence:subject} healed {1:object} for {2}."
            )(viewpointEntity)([
              event.ownerEntityId,
              event.targetEntityId,
              event.eventType.value.value.toString(),
            ]);
          case "Move":
            return renderWithTemplate(
              "{0:sentence:subject} moved through {1:object}."
            )(viewpointEntity)([event.ownerEntityId, event.targetEntityId]);
          // case "status":
          //   return renderSentence({
          //     viewpointEntity,
          //     subject: event.source,
          //     directObject: Object.keys(event.statusEffectMap).join(", "),
          //     indirectObject: event.target,
          //     verb: "applied",
          //     particle: "to",
          //     finalPunctuation: "!",
          //   });
          case "Take":
            return renderWithTemplate("{0:sentence:subject} took {1:object}.")(
              viewpointEntity
            )([event.ownerEntityId, event.targetEntityId]);
          // case "unconscious":
          //   return renderSentence({
          //     viewpointEntity,
          //     subject: event.source,
          //     verb: "became unconscious",
          //     finalPunctuation: "!",
          //   });
          case "Unequip":
            return renderWithTemplate(
              "{0:sentence:subject} unequipped {1:object}."
            )(viewpointEntity)([event.ownerEntityId, event.targetEntityId]);
        }
    }

    return <div>Unknown event type: "{event.eventType.tag}".</div>;
  };

  return { renderEvent };
};
