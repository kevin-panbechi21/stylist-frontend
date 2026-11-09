import { Text, View } from "react-native";
import InlineQueryNotice from "@/components/InlineQueryNotice";
import { color, spacing, type } from "@/design/tokens";
import type { ClosetCountState } from "./closetSummary";

export default function ClosetSummaryNotice({
  state,
  busy,
  onRetry,
}: {
  state: ClosetCountState;
  busy: boolean;
  onRetry: () => unknown;
}) {
  if (state === "current") return null;

  return (
    <View style={{ marginTop: spacing.md }}>
      {state === "stale" || state === "unavailable" ? (
        <InlineQueryNotice
          title={state === "stale"
            ? "Couldn't refresh counts. Showing last known counts."
            : "Couldn't load My Closet counts."}
          actionLabel="Retry"
          accessibilityLabel="Retry My Closet counts"
          busy={busy}
          onRetry={onRetry}
        />
      ) : (
        <Text
          accessibilityState={{ busy }}
          style={{ ...type.caption, color: color.light.stone }}
        >
          {state === "refreshing"
            ? "Updating counts. Showing last known counts."
            : "Loading My Closet counts…"}
        </Text>
      )}
    </View>
  );
}
