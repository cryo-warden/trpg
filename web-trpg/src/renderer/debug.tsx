import type { ReactNode } from "react";
import "./debug.css";
import { Event as StdbEvent } from "../stdb/event_type";
import {
  AllegianceComponent,
  Baseline,
  BaselineComponent,
  Trait,
  TraitsComponent,
} from "../stdb";
import { EntityId } from "../Game/trpg";

export type Event = StdbEvent;

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
  baselines,
  traits,
  baselineComponents,
  traitsComponents,
  allegianceComponents,
}: {
  baselines: Baseline[];
  traits: Trait[];
  baselineComponents: BaselineComponent[];
  traitsComponents: TraitsComponent[];
  allegianceComponents: AllegianceComponent[];
}) => {
  const idToBaselineMap = new Map(baselines.map((b) => [b.id, b]));
  const idToTraitMap = new Map(traits.map((t) => [t.id, t]));
  const entityIdToBaselineComponent = new Map(
    baselineComponents.map((b) => [b.entityId, b])
  );
  const entityIdToTraitsComponent = new Map(
    traitsComponents.map((t) => [t.entityId, t])
  );
  const entityIdToAllegianceComponent = new Map(
    allegianceComponents.map((a) => [a.entityId, a])
  );
  const entityIdToBaselineName = (entityId: EntityId): string => {
    const baselineComponent = entityIdToBaselineComponent.get(entityId);
    if (baselineComponent == null) {
      return "something";
    }

    const baseline = idToBaselineMap.get(baselineComponent.baselineId);
    if (baseline == null) {
      return "something";
    }

    return baseline.name;
  };

  const entityIdToTraitNames = (entityId: EntityId): string[] => {
    const traitsComponent = entityIdToTraitsComponent.get(entityId);
    if (traitsComponent == null) {
      return [];
    }

    const traits = traitsComponent.traitIds
      .map((t) => idToTraitMap.get(t))
      .filter((t) => t != null);
    if (traits == null) {
      return [];
    }

    return traits.map((t) => t.name);
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
  ): string => {
    if (namedEntityId == null) {
      return "something";
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
    const traitNames = entityIdToTraitNames(namedEntityId);
    return (
      (traitNames.length > 0 ? traitNames.join(", ") + " " : "") +
      entityIdToBaselineName(namedEntityId)
    );
  };

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
    { source, target, action }: any | Extract<Event, { type: "action" }>
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

  const renderEvent = (viewpointEntity: EntityId, event: Event): ReactNode => {
    switch (event.eventType.tag) {
      case "StartAction":
        return renderAction(viewpointEntity, event);
      case "ActionEffect":
        switch (event.eventType.value.tag) {
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
            return renderSentence({
              viewpointEntity,
              subject: event.ownerEntityId,
              directObject: event.targetEntityId,
              indirectObject: `${event.eventType.value.value}`,
              verb: "healed",
              particle: "for",
              finalPunctuation: "!",
            });
          case "Move":
            return renderSentence({
              viewpointEntity,
              subject: event.ownerEntityId,
              directObject: event.targetEntityId,
              verb: "moved through",
              finalPunctuation: ".",
            });
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

    return <div>Unknown event type: "{(event as any).type}".</div>;
  };

  return { renderEvent };
};
