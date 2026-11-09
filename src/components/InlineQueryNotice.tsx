import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
} from "react-native";
import {
  color,
  radius,
  spacing,
  touchTarget,
  type,
} from "@/design/tokens";

type InlineQueryNoticeProps = {
  title: string;
  actionLabel: string;
  accessibilityLabel?: string;
  onRetry: () => unknown;
  busy?: boolean;
};

export default function InlineQueryNotice({
  title,
  actionLabel,
  accessibilityLabel = actionLabel,
  onRetry,
  busy = false,
}: InlineQueryNoticeProps) {
  return (
    <View
      style={{
        minHeight: touchTarget.primary,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing.md,
        paddingLeft: spacing.md,
        paddingRight: spacing.xs,
        paddingVertical: spacing.sm,
        borderRadius: radius.control,
        borderWidth: 1,
        borderColor: color.light.warning,
        backgroundColor: color.light.paper,
      }}
    >
      <Text
        accessibilityRole="alert"
        style={{
          flex: 1,
          ...type.captionStrong,
          color: color.light.ink,
        }}
      >
        {title}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ busy, disabled: busy }}
        disabled={busy}
        onPress={() => onRetry()}
        style={({ pressed }) => ({
          minWidth: 64,
          minHeight: touchTarget.minimum,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.md,
          borderRadius: radius.pill,
          backgroundColor: busy
            ? color.light.stone
            : pressed
              ? color.light.inkSoft
              : color.light.ink,
        })}
      >
        {busy ? (
          <ActivityIndicator size="small" color={color.light.paper} />
        ) : (
          <Text style={{ ...type.label, color: color.light.paper }}>
            {actionLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
