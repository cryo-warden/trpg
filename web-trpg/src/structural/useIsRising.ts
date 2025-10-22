/* eslint-disable */
// Allow the access of ref values during render, in limited capacity.

import { useRef } from "react";

export const useIsRising = (initialValue: number, currentValue: number) => {
  const lastValueRef = useRef(initialValue);
  const wasRisingRef = useRef(true);
  const isRising =
    currentValue === lastValueRef.current
      ? wasRisingRef.current
      : currentValue >= lastValueRef.current;
  lastValueRef.current = currentValue;
  wasRisingRef.current = isRising;
  return isRising;
};
