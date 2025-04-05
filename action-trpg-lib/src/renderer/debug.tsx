import type { ReactNode } from "react";
import type { Entity } from "../Entity";
import type { EntityEvent } from "../structures/EntityEvent";
import "./debug.css";

// TODO Fix React peer dependency.
export const bindRenderer = ({ React }: { React: any }) => {
  React; // Make React count as a used parameter.

  const getName = (
    viewpointEntity: Entity,
    named: Entity | string | undefined,
    subject?: Entity | string | undefined
  ): string | null => {
    if (named == null) {
      return null;
    }
    if (typeof named === "string") {
      return named;
    }
    if (viewpointEntity === named) {
      if (subject === named) {
        return "yourself";
      } else {
        return "you";
      }
    }
    return named.name;
  };

  const capitalize = (word: string) =>
    word.substring(0, 1).toUpperCase() + word.substring(1);

  const getClassName = (
    viewpointEntity: Entity,
    entity: Entity | string | undefined
  ) => {
    if (entity == null || typeof entity === "string") {
      return "";
    }
    if (viewpointEntity.allegiance == null || entity.allegiance == null) {
      return "neutral";
    }
    if (viewpointEntity.allegiance === entity.allegiance) {
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
    viewpointEntity: Entity;
    subject: Entity | string;
    directObject?: Entity | string;
    indirectObject?: Entity | string;
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

  const renderEvent = (
    viewpointEntity: Entity,
    event: EntityEvent
  ): ReactNode => {
    switch (event.type) {
      case "action":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: event.action.name,
          indirectObject: event.target,
          verb: "began to perform",
          particle: "on",
        });
      case "damage":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: `${event.damage} damage`,
          indirectObject: event.target,
          verb: "dealt",
          particle: "to",
          finalPunctuation: "!",
        });
      case "heal":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: event.target,
          indirectObject: `${event.heal}`,
          verb: "healed",
          particle: "for",
          finalPunctuation: "!",
        });
      case "status":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: Object.keys(event.statusEffectMap).join(", "),
          indirectObject: event.target,
          verb: "applied",
          particle: "to",
          finalPunctuation: "!",
        });
      case "dead":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          verb: "died",
          finalPunctuation: "!",
        });
      case "unconscious":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          verb: "became unconscious",
          finalPunctuation: "!",
        });
    }

    return <div>{JSON.stringify(event)}</div>;
  };

  return { renderEvent };
};
