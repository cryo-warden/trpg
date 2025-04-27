import type { ReactNode } from "react";
import type { Engine } from "../Engine";
import type { EngineEntity } from "../Entity";
import type { AttackRenderer, Resource } from "../Resource";
import type { EngineEntityEvent } from "../structures/EntityEvent";
import "./debug.css";

// TODO Fix React peer dependency.
export const bindRenderer = <const TResource extends Resource<TResource>>({
  engine,
  React,
}: {
  engine: Engine<TResource>;
  React: any;
}) => {
  React; // Make React count as a used parameter.

  type Entity = EngineEntity<typeof engine>;
  type EntityEvent = EngineEntityEvent<typeof engine>;

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

  const renderAction = (
    viewpointEntity: Entity,
    { source, target, action }: Extract<EntityEvent, { type: "action" }>
  ): ReactNode => {
    const a = engine.resource.actionRecord[action];
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
    viewpointEntity: Entity,
    event: EntityEvent
  ): ReactNode => {
    switch (event.type) {
      case "action":
        return renderAction(viewpointEntity, event);
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
      case "dead":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          verb: "died",
          finalPunctuation: "!",
        });
      case "drop":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: event.target,
          verb: "dropped",
          finalPunctuation: ".",
        });
      case "equip":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: event.target,
          verb: "equipped",
          finalPunctuation: ".",
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
      case "move":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: event.target,
          verb: "moved through",
          finalPunctuation: ".",
        });
      case "stats": {
        return null;
      }
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
      case "take":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: event.target,
          verb: "took",
          finalPunctuation: ".",
        });
      case "unconscious":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          verb: "became unconscious",
          finalPunctuation: "!",
        });
      case "unequip":
        return renderSentence({
          viewpointEntity,
          subject: event.source,
          directObject: event.target,
          verb: "unequipped",
          finalPunctuation: ".",
        });
    }

    return <div>Unknown event type: "{(event as any).type}".</div>;
  };

  return { renderEvent };
};
