import type { ReactNode } from "react";
import type { Observation } from "../structures/Observation";

// TODO Fix peer dependency.
export const bindRenderer = ({ React }: { React: any }) => {
  const renderObservation = (observation: Observation): ReactNode => {
    switch (observation.type) {
      case "action":
        return (
          <div>
            {observation.entity.name} performs {observation.action.name} on {""}
            {observation.target.name}.
          </div>
        );
      case "damage":
        return (
          <div>
            {observation.entity.name} causes {observation.damage} damage to {""}
            {observation.target.name}!
          </div>
        );
      case "heal":
        return (
          <div>
            {observation.entity.name} heals {observation.target.name} for {""}
            {observation.heal}!
          </div>
        );
      case "status":
        return (
          <div>
            {observation.entity.name} applies {""}
            {Object.keys(observation.statusEffectMap).join(", ")} to {""}
            {observation.target.name}.
          </div>
        );
      case "dead":
        return <div>{observation.entity.name} has died!</div>;
      case "unconscious":
        return <div>{observation.entity.name} became unconscious!</div>;
    }

    return <div>{JSON.stringify(observation)}</div>;
  };

  return { renderObservation };
};
