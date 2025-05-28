import { ComponentPropsWithRef } from "react";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { Panel } from "../structural/Panel";
import { usePlayerEntity } from "./context/StdbContext";

export const SelfPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const entity = usePlayerEntity();
  if (entity == null) {
    return null;
  }

  return <EntityPanel {...props} entity={entity} detailed hotkey="p" />;
};
