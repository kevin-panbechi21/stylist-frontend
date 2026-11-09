import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/** Prefer immediate feedback until the device explicitly permits motion. */
export function useReducedMotionPreference(): boolean {
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    let observedChange = false;
    let subscription: ReturnType<typeof AccessibilityInfo.addEventListener>;

    try {
      subscription = AccessibilityInfo.addEventListener(
        "reduceMotionChanged",
        (enabled) => {
          if (!mounted) return;
          observedChange = true;
          setReducedMotion(enabled !== false);
        },
      );
    } catch {
      // Without a live preference subscription, keep motion disabled.
      return () => { mounted = false; };
    }

    Promise.resolve()
      .then(() => AccessibilityInfo.isReduceMotionEnabled())
      .then((enabled) => {
        // A newer device event outranks the initial asynchronous snapshot.
        if (mounted && !observedChange) setReducedMotion(enabled !== false);
      })
      .catch(() => {
        if (mounted && !observedChange) setReducedMotion(true);
      });

    return () => {
      mounted = false;
      try {
        subscription?.remove();
      } catch {
        // A native teardown failure must not interrupt navigation.
      }
    };
  }, []);

  return reducedMotion;
}
