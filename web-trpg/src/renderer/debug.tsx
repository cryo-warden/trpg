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

export const actionWeightType = ["heavy", "neutral", "light"] as const;

export type ActionWeightType = (typeof actionWeightType)[number];

export const actionSpeedType = ["slow", "neutral", "fast"] as const;

export type ActionSpeedType = (typeof actionSpeedType)[number];

export const actionArmamentType = [
  "blade",
  "sword",
  "club",
  "staff",
  "fist",
  "claw",
  "teeth",
  "stick",
  "spout",
] as const;

export type ActionArmamentType = (typeof actionArmamentType)[number];

export type AttackRenderer = {
  weightType: ActionWeightType;
  speedType: ActionSpeedType;
  armamentType: ActionArmamentType;
};

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

  // TODO Update context and use it.
  const renderValue =
    (viewpointEntityId: EntityId): RenderValue<EntityId | ReactNode, any> =>
    (value, context) => {
      if (typeof value === "bigint") {
        return [
          <span className={getClassName(viewpointEntityId, value)}>
            {getName(viewpointEntityId, value) ?? ""}
          </span>,
          context,
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
          {renderTemplate(renderValue(viewpointEntity))(template)(values, {})}
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

  const renderSentence = ({
    viewpointEntity,
    subject,
    directObject,
    indirectObject,
    verb,
    particle = "to",
    finalPunctuation = ".",
  }: {
    viewpointEntity: EntityId;
    subject: EntityId | string;
    directObject?: EntityId | string;
    indirectObject?: EntityId | string;
    verb: string;
    particle?: string;
    finalPunctuation?: string;
  }) => {
    const subjectName = getName(viewpointEntity, subject) ?? "";
    const subjectNode = (
      <span className={getClassName(viewpointEntity, subject)}>
        {capitalize(subjectName)}
      </span>
    );

    const directObjectName = getName(viewpointEntity, directObject, subject);
    const directObjectNode = (
      <span className={getClassName(viewpointEntity, directObject)}>
        {directObjectName}
      </span>
    );

    const indirectObjectName = getName(
      viewpointEntity,
      indirectObject,
      subject
    );
    const indirectObjectNode = (
      <span className={getClassName(viewpointEntity, indirectObject)}>
        {indirectObjectName}
      </span>
    );

    if (directObjectName != null && indirectObjectName != null) {
      return (
        <div className="debug renderer">
          {subjectNode} {verb} {directObjectNode} {particle}{" "}
          {indirectObjectNode}
          {finalPunctuation}
        </div>
      );
    }

    if (directObjectName != null) {
      return (
        <div className="debug renderer">
          {subjectNode} {verb} {directObjectNode}
          {finalPunctuation}
        </div>
      );
    }

    if (indirectObjectName != null) {
      return (
        <div className="debug renderer">
          {subjectNode} {verb} {particle} {indirectObjectNode}
          {finalPunctuation}
        </div>
      );
    }

    return (
      <div className="debug renderer">
        {subjectNode} {verb}
        {finalPunctuation}
      </div>
    );
  };

  const getActionWeightAdjective = (r: AttackRenderer): string => {
    switch (r.weightType) {
      case "heavy":
        return " great";
      case "neutral":
        return "";
      case "light":
        return " small";
    }
  };

  const getActionSpeedVerb = (r: AttackRenderer): string => {
    switch (r.speedType) {
      case "slow":
        return "heave";
      case "neutral":
        return "swing";
      case "fast":
        return "fling";
    }
  };

  const getActionObjectName = (r: AttackRenderer): string => {
    switch (r.armamentType) {
      case "blade":
        return "blade";
      case "sword":
        return "sword";
      case "club":
        return "club";
      case "staff":
        return "staff";
      case "fist":
        return "fist";
      case "claw":
        return "claw";
      case "teeth":
        return "fangs";
      case "spout":
        return "spout";
      case "stick":
        return "stick";
    }
  };

  const getActionDirectObject = (r: AttackRenderer): string => {
    const verb = getActionSpeedVerb(r);
    const adjective = getActionWeightAdjective(r);

    switch (r.armamentType) {
      case "fist":
        return `${verb} a${adjective} fist`;
      case "teeth":
        return `bare${adjective} fangs`;
      case "spout":
        return `well up a${adjective} spout`;
    }

    const objectName = getActionObjectName(r);

    return `${verb} a${adjective} ${objectName}`;
  };

  // WIP Render the new event format.
  const renderAction = (
    viewpointEntity: EntityId,
    { source, target, action }: any | Extract<EntityEvent, { type: "action" }>
  ): ReactNode => {
    const a = {
      // WIP
      name: String(action),
      renderer: {
        armamentType: "fist",
        speedType: "slow",
        weightType: "heavy",
      } satisfies AttackRenderer,
    };
    return renderSentence({
      viewpointEntity,
      subject: source,
      directObject:
        a.renderer != null ? getActionDirectObject(a.renderer) : a.name,
      indirectObject: target,
      verb: "began to",
      particle: a.renderer != null ? "at" : "",
    });
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
            return renderSentence({
              viewpointEntity,
              subject: event.ownerEntityId,
              directObject: `${event.eventType.value.value} damage`,
              indirectObject: event.targetEntityId,
              verb: "dealt",
              particle: "to",
              finalPunctuation: "!",
            });
          // case "dead":
          //   return renderSentence({
          //     viewpointEntity,
          //     subject: event.source,
          //     verb: "died",
          //     finalPunctuation: "!",
          //   });
          case "Drop":
            return renderSentence({
              viewpointEntity,
              subject: event.ownerEntityId,
              directObject: event.targetEntityId,
              verb: "dropped",
              finalPunctuation: ".",
            });
          case "Equip":
            return renderSentence({
              viewpointEntity,
              subject: event.ownerEntityId,
              directObject: event.targetEntityId,
              verb: "equipped",
              finalPunctuation: ".",
            });
          case "Heal":
            return renderWithTemplate("{0:sentence} healed {1} for {2}.")(
              viewpointEntity
            )([
              event.ownerEntityId,
              event.targetEntityId,
              event.eventType.value.value.toString(),
            ]);
          case "Move":
            return renderWithTemplate("{0:sentence} moved through {1}.")(
              viewpointEntity
            )([event.ownerEntityId, event.targetEntityId]);
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
            return renderSentence({
              viewpointEntity,
              subject: event.ownerEntityId,
              directObject: event.targetEntityId,
              verb: "took",
              finalPunctuation: ".",
            });
          // case "unconscious":
          //   return renderSentence({
          //     viewpointEntity,
          //     subject: event.source,
          //     verb: "became unconscious",
          //     finalPunctuation: "!",
          //   });
          case "Unequip":
            return renderSentence({
              viewpointEntity,
              subject: event.ownerEntityId,
              directObject: event.targetEntityId,
              verb: "unequipped",
              finalPunctuation: ".",
            });
        }
    }

    return <div>Unknown event type: "{event.eventType.tag}".</div>;
  };

  return { renderEvent };
};
