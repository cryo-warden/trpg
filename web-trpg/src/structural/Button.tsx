import { ComponentPropsWithoutRef, useCallback } from "react";
import "./Button.css";
import { useHotkeyRef } from "./useHotkeyRef";

export const Button = ({
  hotkey,
  interesting = false,
  children,
  className,
  onClick,
  ...props
}: {
  hotkey?: string;
  /** Renders the shared "more interesting" badge: the one marker for
   * unvisited destinations, worn gear, and assigned armaments. */
  interesting?: boolean;
} & ComponentPropsWithoutRef<"button">) => {
  const buttonRef = useHotkeyRef(hotkey);

  const handleClick: {} & typeof onClick = useCallback(
    (e) => {
      if (onClick == null) {
        return;
      }

      e.stopPropagation();
      onClick(e);
      const button = buttonRef.current;
      if (button != null) {
        setTimeout(() => {
          button.blur();
        }, 200);
      }
    },
    [buttonRef, onClick]
  );

  return (
    <button
      {...props}
      ref={buttonRef}
      className={["Button", interesting ? "interesting" : "", className ?? ""].join(
        " ",
      )}
      onClick={handleClick}
    >
      {children}
      {hotkey && <div className="hotkey">{hotkey.toUpperCase()}</div>}
    </button>
  );
};
