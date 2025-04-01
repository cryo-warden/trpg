import { ComponentPropsWithRef } from "react";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { useControllerEntity } from "./context/ControllerContext";

export const SelfPanel = (props: ComponentPropsWithRef<typeof EntityPanel>) => {
  const entity = useControllerEntity();
  if (entity == null) {
    return null;
  }

  return <EntityPanel {...props} entity={entity} detailed hotkey="p" />;
};
