import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

/**
 * Set a given ref to a given value
 * This utility takes care of different types of refs: callback refs and RefObject(s)
 */
function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === "function") {
    const cleanupRef = ref(value);
    return typeof cleanupRef === "function" ? cleanupRef : undefined;
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

/**
 * A utility to compose multiple refs together
 * Accepts callback refs and RefObject(s)
 */
function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T) => {
    const cleanupFunctions: Array<(() => void) | undefined> = [];
    for (const ref of refs) {
      const cleanup = setRef(ref, node);
      if (cleanup) {
        cleanupFunctions.push(cleanup);
      }
    }

    return () => {
      for (const cleanup of cleanupFunctions) {
        if (typeof cleanup === "function") {
          cleanup();
        }
      }
    };
  };
}

/**
 * A custom hook that composes multiple refs
 * Accepts callback refs and RefObject(s)
 */
function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return React.useCallback(composeRefs(...refs), refs);
}

export { composeRefs, useComposedRefs };
