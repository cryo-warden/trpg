import { useMemo, type ReactNode } from "react";
import "./debug.css";
import { EntityEvent } from "../stdb";
import { ActionId, EntityId } from "../Game/trpg";
import { renderTemplate, RenderValue } from "./template";
import {
  useActions,
  useAllegianceComponents,
  useAppearanceFeatures,
  useAppearanceFeaturesComponents,
  usePlayerEntity,
} from "../Game/context/StdbContext";

type RenderContext = {
  subject: null | EntityId;
  object: null | EntityId;
};

const capitalize = (word: string) =>
  word.substring(0, 1).toUpperCase() + word.substring(1);

const useGetActionTemplate = () => {
  const actions = useActions();
  return useMemo(() => {
    const idToActionMap = new Map(actions.map((a) => [a.id, a]));
    return (actionId: ActionId) => {
      const action = idToActionMap.get(actionId);
      if (action == null) {
        return null;
      }

      return action.beginTemplate;
    };
  }, [actions]);
};

const useGetName = () => {
  const viewpointEntityId = usePlayerEntity();
  const appearanceFeatures = useAppearanceFeatures();
  const appearanceFeaturesComponents = useAppearanceFeaturesComponents();

  return useMemo(() => {
    const idToAppearanceFeature = new Map(
      appearanceFeatures.map((af) => [af.id, af])
    );
    const entityIdToAppearanceFeaturesComponent = new Map(
      appearanceFeaturesComponents.map((c) => [c.entityId, c])
    );
    const entityIdToName = (entityId: EntityId): string => {
      const appearanceFeaturesComponent =
        entityIdToAppearanceFeaturesComponent.get(entityId);

      if (appearanceFeaturesComponent == null) {
        return "something";
      }

      const appearanceFeatures =
        appearanceFeaturesComponent.appearanceFeatureIds
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
    return (
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
  }, [appearanceFeatures, appearanceFeaturesComponents, viewpointEntityId]);
};

const useGetClassName = () => {
  const viewpointEntityId = usePlayerEntity();
  const allegianceComponents = useAllegianceComponents();

  const entityIdToAllegianceId = useMemo(() => {
    const entityIdToAllegianceComponent = new Map(
      allegianceComponents.map((a) => [a.entityId, a])
    );
    return (entityId: EntityId | null): EntityId | null => {
      if (entityId == null) {
        return null;
      }
      return (
        entityIdToAllegianceComponent.get(entityId)?.allegianceEntityId ?? null
      );
    };
  }, [allegianceComponents]);

  return useMemo(
    () => (entity: EntityId | string | undefined) => {
      if (entity == null || typeof entity === "string") {
        return "";
      }
      const viewpointAllegianceId = entityIdToAllegianceId(viewpointEntityId);
      const entityAllegianceId = entityIdToAllegianceId(entity);
      if (viewpointAllegianceId == null || entityAllegianceId == null) {
        return "neutral";
      }
      if (viewpointAllegianceId === entityAllegianceId) {
        return "friendly";
      }
      return "hostile";
    },
    [viewpointEntityId, allegianceComponents]
  );
};

export const useDebugRenderer = () => {
  const getName = useGetName();
  const getClassName = useGetClassName();
  const getActionTemplate = useGetActionTemplate();

  const renderValue: RenderValue<EntityId | ReactNode, RenderContext> = useMemo(
    () => (value, ruleSet, context) => {
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
          <span className={getClassName(value)}>
            {postProcess(
              getName(
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
    },
    [getName, getClassName]
  );

  const renderWithTemplate = useMemo(() => {
    const boundRenderTemplate = renderTemplate(renderValue);

    const templateCache = new Map<
      string,
      ReturnType<typeof boundRenderTemplate>
    >();

    const getTemplate = (template: string) => {
      if (templateCache.has(template)) {
        return templateCache.get(template)!;
      }
      const result = boundRenderTemplate(template);
      templateCache.set(template, result);
      return result;
    };

    return (template: string) => (values: (EntityId | ReactNode)[]) =>
      (
        <div className="debug renderer">
          {getTemplate(template)(values, {
            object: null,
            subject: null,
          })}
        </div>
      );
  }, [renderValue]);

  const renderAction = useMemo(
    () =>
      (event: EntityEvent): ReactNode => {
        if (event.eventType.tag !== "StartAction") {
          throw new Error(
            `Unexpected event type "${event.eventType.tag}" cannot be rendered as an action.`
          );
        }
        const actionId = event.eventType.value;
        const template = getActionTemplate(actionId);
        return renderWithTemplate(
          template ??
            "{0:sentence:subject} began a mysterious action toward {1:object}."
        )([event.ownerEntityId, event.targetEntityId]);
      },
    [renderWithTemplate, getActionTemplate]
  );

  const renderEvent = useMemo(
    () =>
      (event: EntityEvent): ReactNode => {
        switch (event.eventType.tag) {
          case "StartAction":
            return renderAction(event);
          case "ActionEffect":
            switch (event.eventType.value.tag) {
              case "Rest":
                return null;
              case "Attack":
                return renderWithTemplate(
                  "{0:sentence:subject} dealt {2} damage to {1:object}!"
                )([
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
                )([event.ownerEntityId, event.targetEntityId]);
              case "Equip":
                return renderWithTemplate(
                  "{0:sentence:subject} equipped {1:object}."
                )([event.ownerEntityId, event.targetEntityId]);
              case "Heal":
                return renderWithTemplate(
                  "{0:sentence:subject} healed {1:object} for {2}."
                )([
                  event.ownerEntityId,
                  event.targetEntityId,
                  event.eventType.value.value.toString(),
                ]);
              case "Move":
                return renderWithTemplate(
                  "{0:sentence:subject} moved through {1:object}."
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
                return renderWithTemplate(
                  "{0:sentence:subject} took {1:object}."
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
                )([event.ownerEntityId, event.targetEntityId]);
            }
        }

        return <div>Unknown event type: "{event.eventType.tag}".</div>;
      },
    [renderAction, renderWithTemplate]
  );

  return { renderEvent };
};
