import { ComponentPropsWithRef } from "react";
import { Panel } from "../structural/Panel";
import { usePlayerEntity } from "./context/StdbContext/components";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";

export const SelfPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const entity = usePlayerEntity();
  if (entity == null) {
    return null;
  }

  // "g": the inner edge of the LEFT (targeting) hand — self is a target
  // too, and "p" now belongs to the action keys.
  return <EntityPanel {...props} entity={entity} detailed hotkey="g" />;
};
