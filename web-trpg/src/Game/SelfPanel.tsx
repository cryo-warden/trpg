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

  return <EntityPanel {...props} entity={entity} detailed hotkey="p" />;
};
