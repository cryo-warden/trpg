import "./Scroller.css";

import React, {
  UIEvent,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type ScrollerProps = {
  bottomLock?: boolean;
} & React.HTMLProps<HTMLDivElement>;

export const Scroller = ({
  children,
  bottomLock = false,
  className,
  ...props
}: ScrollerProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastScrollTopRef = useRef(0);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(bottomLock);
  const scrollToBottom = useCallback(() => {
    if (ref.current != null) {
      ref.current.scrollTop =
        ref.current.scrollHeight - ref.current.clientHeight;
    }
  }, [ref]);
  const handleClick = useCallback(
    (e: MouseEvent) => {
      scrollToBottom();
      e.stopPropagation();
    },
    [scrollToBottom]
  );
  const handleScroll = useCallback(
    (e: UIEvent) => {
      const element = e.currentTarget;
      if (element.scrollTop < lastScrollTopRef.current) {
        setIsScrolledToBottom(false);
      } else if (
        element.scrollTop + 10 >=
        element.scrollHeight - element.clientHeight
      ) {
        setIsScrolledToBottom(true);
      }
      lastScrollTopRef.current = element.scrollTop;
    },
    [lastScrollTopRef, setIsScrolledToBottom]
  );
  useEffect(() => {
    if (bottomLock && isScrolledToBottom) {
      setTimeout(scrollToBottom, 0);
    }
  });

  return (
    <div {...props} className={["Scroller", className ?? ""].join(" ")}>
      <div ref={ref} className="scrollArea" onScroll={handleScroll}>
        {children}
      </div>
      {bottomLock && !isScrolledToBottom && (
        <button className="scrollToBottom" onClick={handleClick}>
          end
        </button>
      )}
    </div>
  );
};
