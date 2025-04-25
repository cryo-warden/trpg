import { ComponentPropsWithRef } from "react";
import { EntityPanel } from "./EntityPanel";
import "./SelfPanel.css";
import { useControllerEntityToken } from "./context/ControllerContext";
import { Panel } from "../structural/Panel";

export const SelfPanel = (props: ComponentPropsWithRef<typeof Panel>) => {
  const entityToken = useControllerEntityToken();
  if (entityToken.value == null) {
    return null;
  }

  return (
    <EntityPanel {...props} entityToken={entityToken} detailed hotkey="p" />
  );
};
